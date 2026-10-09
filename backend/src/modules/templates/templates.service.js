import * as repository from './templates.repository.js';

export function list() {
  return repository.listTemplates();
}
