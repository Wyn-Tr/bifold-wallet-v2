// Jest stub for @ajna-inc/openbadges/build/cryptosuites/contextPreprocessor.
// The real module is reached via a deep import that the package's `exports`
// field doesn't allow under Node/Jest resolution (Metro/RN resolves it fine at
// runtime). Tests don't exercise JSON-LD verification, so stubbing is enough
// to unblock the resolver.
module.exports = {
  createPreprocessingDocumentLoader: () => async (url) => ({
    contextUrl: null,
    document: {},
    documentUrl: url,
  }),
  clearContextCache: () => {},
  prewarmContextCache: async () => {},
}
