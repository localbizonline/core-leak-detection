#!/usr/bin/env node
/**
 * extract-airtable-fields.mjs
 *
 * Extracts only website-relevant fields from a full Airtable record dump.
 * The Airtable MCP tool returns ALL 250+ fields (~85KB). This script
 * strips it down to the ~35 fields needed for website builds (~5KB).
 *
 * Usage:
 *   node scripts/extract-airtable-fields.mjs --input /path/to/raw-airtable.json --output /path/to/client-config.json
 *
 *   # Or pipe from stdin:
 *   cat raw-airtable.json | node scripts/extract-airtable-fields.mjs --output /path/to/client-config.json
 *
 * Input:  Airtable API response JSON { records: [{ id, fields: {...} }] }
 * Output: Clean client-config.json with only website-relevant fields mapped to camelCase
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// --- Field Map: Airtable field name → client-config key ---
// These match EXACTLY the 38 fields visible in the "Website fields for Claude" view (viw18y4IIZmVzWV79).
// Everything else is discarded.
const FIELD_MAP = {
  // Identity
  'LPP - Company Name':                         'companyName',
  'Company name':                                '_companyNameFallback',
  'Niche your business covers':                  '_nicheRecordIds',
  'OLD City based in':                           'primaryCity',
  'City Based In':                               '_cityRecordIds',
  'Business owner name':                         '_ownerFirst',
  'Business owner surname':                      '_ownerLast',
  'LLP - Year business started':                 'yearStarted',

  // Contact
  'Phone number sent to leads':                  'phone',
  'Business owner contact number':               'ownerPhone',
  'Whatsapp Nr Formatted':                       'whatsapp',
  'Business owners email':                       'email',
  'Email address leads should be sent to':       'leadEmail',
  'Physical Address':                            'address',

  // Content
  'Partner About':                               'aboutText',
  'About Prompt':                                'aboutPrompt',
  'About Prompt OUTPUT':                         'aboutGenerated',
  'Partner Experience':                          'experience',
  'Partner Services':                            'servicesRaw',
  'Services Rewrite OUTPUT':                     'servicesGenerated',
  'Service Rewrite PROMPT':                      'serviceRewritePrompt',
  'Best/Favorite Services':                      'favoriteServices',
  'All Content About Partner':                   'allContent',
  'Partner Profiles Info':                       'profilesInfo',
  'Website Content Writing Prompt':              'contentWritingPrompt',

  // Features & Business Info
  'Choose features that match your business':    'features',
  'Staff numbers':                               'staffCount',

  // Media (attachments)
  'Partner Logo':                                '_logoAttachment',
  'Partner Headshot':                            '_headshotAttachment',
  'Gallery':                                     '_galleryAttachment',

  // Social & Reviews
  'Partner Website':                             'existingWebsite',
  'Facebook':                                    'facebookUrl',
  'Instagram':                                   'instagramUrl',
  'Google Business Profile':                     'googleBusinessUrl',
  'Google Rating':                               'googleRating',

  // Areas (linked records + lookups)
  'What areas does your company service?':       '_areaRecordIds',
  'Area Selections (from Business Profiles / Deliveries)': '_areaSelections',
  'Service Selections (from Business Profiles / Deliveries) 2': 'serviceSelections',
};

function extractAttachmentUrl(attachment) {
  if (!attachment || !Array.isArray(attachment) || attachment.length === 0) return null;
  return attachment[0].url || null;
}

function extractAttachmentUrls(attachment) {
  if (!attachment || !Array.isArray(attachment) || attachment.length === 0) return [];
  return attachment.map(a => ({
    url: a.url,
    filename: a.filename,
    width: a.width || null,
    height: a.height || null,
  }));
}

function extractNicheText(nicheValue) {
  // Niche your business covers is a linked record field.
  // It may return an array of record IDs (strings starting with 'rec')
  // or an array of text values. Handle both cases.
  if (!nicheValue) return '';
  if (typeof nicheValue === 'string') return nicheValue;
  if (Array.isArray(nicheValue)) {
    // Filter out record IDs (start with 'rec' and are 17 chars)
    const textValues = nicheValue.filter(v => typeof v === 'string' && !v.match(/^rec[A-Za-z0-9]{14}$/));
    if (textValues.length > 0) return textValues.join(', ');
    // If all are record IDs, return empty — downstream will need to handle
    return '';
  }
  return '';
}

function formatPhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/[^\d+]/g, '');
  // Convert 0XX to +27XX
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '+27' + clean.slice(1);
  }
  // Format: +27 XX XXX XXXX
  if (clean.startsWith('+27') && clean.length === 12) {
    return `+27 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return phone; // return original if can't format
}

function transformRecord(record) {
  const fields = record.fields || {};
  const extracted = {};

  // Extract mapped fields
  for (const [airtableField, configKey] of Object.entries(FIELD_MAP)) {
    if (fields[airtableField] !== undefined) {
      extracted[configKey] = fields[airtableField];
    }
  }

  // --- Post-processing ---

  // Company name: prefer LPP - Company Name, fall back to Company name
  const config = {
    recordId: record.id,
    companyName: extracted.companyName || extracted._companyNameFallback || '',
    niche: extractNicheText(extracted._nicheRecordIds),
    primaryCity: extracted.primaryCity || '',
    ownerName: [extracted._ownerFirst, extracted._ownerLast].filter(Boolean).join(' ').trim() || null,
    yearStarted: extracted.yearStarted || null,

    // Contact
    phone: formatPhone(extracted.phone),
    ownerPhone: formatPhone(extracted.ownerPhone),
    whatsapp: extracted.whatsapp || null,  // Already formatted in Airtable
    email: extracted.email || null,
    leadEmail: extracted.leadEmail || null,
    address: extracted.address || null,

    // Content
    aboutText: extracted.aboutText || null,
    aboutPrompt: extracted.aboutPrompt || null,
    aboutGenerated: extracted.aboutGenerated || null,
    experience: extracted.experience || null,
    servicesRaw: extracted.servicesRaw || null,
    servicesGenerated: extracted.servicesGenerated || null,
    serviceRewritePrompt: extracted.serviceRewritePrompt || null,
    favoriteServices: extracted.favoriteServices || null,
    allContent: extracted.allContent || null,
    profilesInfo: extracted.profilesInfo || null,
    contentWritingPrompt: extracted.contentWritingPrompt || null,

    // Parse services into array
    services: parseServices(extracted.servicesRaw),

    // Features & Business
    features: extracted.features || [],
    staffCount: extracted.staffCount || null,

    // Media - extract URLs from attachments
    logoUrl: extractAttachmentUrl(extracted._logoAttachment),
    headshotUrl: extractAttachmentUrl(extracted._headshotAttachment),
    galleryUrls: extractAttachmentUrls(extracted._galleryAttachment),

    // Social & Reviews
    existingWebsite: extracted.existingWebsite || null,
    facebookUrl: extracted.facebookUrl || null,
    instagramUrl: extracted.instagramUrl || null,
    googleBusinessUrl: extracted.googleBusinessUrl || null,
    googleRating: extracted.googleRating || null,

    // Areas (may be record IDs or text)
    areas: extracted._areaSelections || extracted._areaRecordIds || [],
    serviceSelections: extracted.serviceSelections || [],
  };

  return config;
}

function parseServices(servicesRaw) {
  if (!servicesRaw) return [];
  // Split by newlines, commas, or pipes
  return servicesRaw
    .split(/[\n|,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outputIdx = args.indexOf('--output');

  let inputData;

  if (inputIdx !== -1 && args[inputIdx + 1]) {
    const inputPath = resolve(args[inputIdx + 1]);
    inputData = readFileSync(inputPath, 'utf8');
  } else {
    // Read from stdin
    inputData = readFileSync('/dev/stdin', 'utf8');
  }

  const parsed = JSON.parse(inputData);

  // Handle both single record and records array
  let record;
  if (parsed.records && parsed.records.length > 0) {
    record = parsed.records[0];
  } else if (parsed.id && parsed.fields) {
    record = parsed;
  } else {
    console.error('Error: No record found in input');
    process.exit(1);
  }

  const config = transformRecord(record);

  const output = JSON.stringify(config, null, 2);

  if (outputIdx !== -1 && args[outputIdx + 1]) {
    const outputPath = resolve(args[outputIdx + 1]);
    writeFileSync(outputPath, output, 'utf8');
    console.log(`Extracted ${Object.keys(config).length} fields → ${outputPath}`);
    console.log(`Size: ${Buffer.byteLength(output)} bytes (down from ${Buffer.byteLength(inputData)} bytes)`);
  } else {
    process.stdout.write(output);
  }
}

main();
