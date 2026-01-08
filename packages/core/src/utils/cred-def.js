import { AnonCredsCredentialMetadataKey, parseIndyCredentialDefinitionId, parseIndySchemaId } from '@credo-ts/anoncreds';
import { credentialSchema } from './schema';
import { ensureCredentialMetadata, getEffectiveCredentialName } from './credential';
// Fallback default credential name when no other name is available
export const fallbackDefaultCredentialNameValue = 'Credential';
// Default credential definition tag value
export const defaultCredDefTag = 'default';
// Normalize incoming identifiers by trimming whitespace and converting empty strings to undefined
function normalizeId(id) {
    if (typeof id !== 'string')
        return undefined;
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export async function getCredentialName(credDefId, schemaId) {
    const normalizedCredDefId = normalizeId(credDefId);
    const normalizedSchemaId = normalizeId(schemaId);
    return parseIndyCredDefId(normalizedCredDefId, normalizedSchemaId);
}
function parseIndyCredDefId(credDefId, schemaId) {
    let name = fallbackDefaultCredentialNameValue;
    if (credDefId) {
        try {
            const parsedCredDef = parseIndyCredentialDefinitionId(credDefId);
            name = parsedCredDef?.tag ?? name;
        }
        catch {
            // If parsing fails, keep the default name
        }
    }
    if (name.toLowerCase() === defaultCredDefTag ||
        name.toLowerCase() === fallbackDefaultCredentialNameValue.toLowerCase()) {
        if (schemaId) {
            try {
                const parsedSchema = parseIndySchemaId(schemaId);
                name = parsedSchema?.schemaName ?? name;
            }
            catch {
                // If parsing fails, keep the default name
                name = fallbackDefaultCredentialNameValue;
            }
        }
        else {
            name = fallbackDefaultCredentialNameValue;
        }
    }
    return name;
}
function credentialDefinition(credential) {
    return credential.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId;
}
export function getSchemaName(credential) {
    const metadata = credential.metadata.get(AnonCredsCredentialMetadataKey);
    const schemaName = metadata?.schemaName;
    return schemaName;
}
export function getCredDefTag(credential) {
    const metadata = credential.metadata.get(AnonCredsCredentialMetadataKey);
    const credDefTag = metadata?.credDefTag;
    return credDefTag;
}
export async function parsedCredDefNameFromCredential(credential, agent, logger) {
    // Ensure metadata is cached if agent is provided
    if (agent) {
        try {
            await ensureCredentialMetadata(credential, agent, undefined, logger);
        }
        catch (error) {
            // If metadata restoration fails, we'll fall back to parsing IDs or default name
            logger?.warn('Failed to restore credential metadata in parsedCredDefNameFromCredential', {
                error: error,
            });
        }
    }
    // Check if we have cached metadata
    const cachedSchemaName = getSchemaName(credential);
    if (cachedSchemaName) {
        // Use the priority waterfall logic (OCA name > credDefTag > schemaName > fallback)
        return getEffectiveCredentialName(credential);
    }
    // Fallback: parse the IDs if metadata is not cached and no agent to resolve
    const fallbackName = await getCredentialName(credentialDefinition(credential), credentialSchema(credential));
    return fallbackName;
}
export async function parsedCredDefName(credentialDefinitionId, schemaId) {
    return getCredentialName(credentialDefinitionId, schemaId);
}
