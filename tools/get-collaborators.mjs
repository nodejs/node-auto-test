#!/usr/bin/env node
import { createInterface } from 'node:readline';
import fs from 'node:fs';

const README = new URL('../README.md', import.meta.url);
const input = fs.createReadStream(README);

let COLLABORATOR_LIST_START = '### Collaborators';
let COLLABORATOR_LIST_END = '### Collaborator emeriti';

let collaboratorListStarted = false;
for await (const line of createInterface({ input, crlfDelay: Infinity })) {
  if (line === COLLABORATOR_LIST_END) break;
  else if (collaboratorListStarted) console.log(line);
  else if (line === COLLABORATOR_LIST_START)
    collaboratorListStarted = true;
}
