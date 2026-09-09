#!/usr/bin/env node
/**
 * Copy only the Tesseract runtime needed by the Windows desktop payload.
 * The source is discovered on the build host; it is never downloaded or
 * installed by this script. Release CI/build machines must have the official
 * Tesseract runtime available and the resulting installer owns the copy.
 */

import fs from 'node:fs'
import path from 'node:path'

const destination = path.resolve(process.argv[2] ?? '')
const required = process.argv.includes('--required')
if (!destination) throw new Error('package-tesseract: destination is required')

const candidates = [
  process.env.FREECODE_TESSERACT_ROOT,
  process.env.ProgramFiles === undefined ? undefined : path.join(process.env.ProgramFiles, 'Tesseract-OCR'),
  process.env['ProgramFiles(x86)'] === undefined ? undefined : path.join(process.env['ProgramFiles(x86)'], 'Tesseract-OCR'),
  'C:\\Program Files\\Tesseract-OCR',
  'C:\\Program Files (x86)\\Tesseract-OCR',
  '/mnt/c/Program Files/Tesseract-OCR',
  '/mnt/c/Program Files (x86)/Tesseract-OCR',
].filter((value) => typeof value === 'string' && value.length > 0)

const source = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'tesseract.exe')))
if (source === undefined) {
  const message = `package-tesseract: Tesseract-OCR runtime not found; checked ${candidates.join(', ')}`
  if (required) throw new Error(message)
  console.warn(`${message}; continuing without OCR payload for a non-release build`)
  process.exit(0)
}

fs.rmSync(destination, { recursive: true, force: true })
fs.mkdirSync(path.join(destination, 'tessdata'), { recursive: true })
fs.copyFileSync(path.join(source, 'tesseract.exe'), path.join(destination, 'tesseract.exe'))

for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.toLowerCase().endsWith('.dll')) {
    fs.copyFileSync(path.join(source, entry.name), path.join(destination, entry.name))
  }
}

const tessdata = path.join(source, 'tessdata')
if (!fs.existsSync(tessdata)) throw new Error(`package-tesseract: tessdata directory missing under ${source}`)
for (const entry of fs.readdirSync(tessdata, { withFileTypes: true })) {
  // Keep the installed language packs and OCR configs, but do not pull the
  // Java/documentation tooling from the system installation.
  if (entry.isFile() && (entry.name.endsWith('.traineddata') || entry.name === 'pdf.ttf')) {
    fs.copyFileSync(path.join(tessdata, entry.name), path.join(destination, 'tessdata', entry.name))
  }
}

const requiredFiles = [
  path.join(destination, 'tesseract.exe'),
  path.join(destination, 'tessdata', 'eng.traineddata'),
]
for (const file of requiredFiles) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`package-tesseract: required payload missing: ${file}`)
}

console.log(`package-tesseract: copied runtime from ${source} to ${destination}`)
