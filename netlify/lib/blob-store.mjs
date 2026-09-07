import { getDeployStore, getStore } from '@netlify/blobs';

function isProduction() {
  return Netlify.context?.deploy?.context === 'production';
}

export function getPersistentStore(name) {
  if (isProduction()) return getStore(name, { consistency: 'strong' });
  return getDeployStore({ name });
}
