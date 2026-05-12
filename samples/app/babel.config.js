module.exports = {
  presets: [
    [
      'module:@react-native/babel-preset',
      {
        unstable_transformProfile: 'hermes-stable',
      },
    ],
  ],
  plugins: [
    ['module-resolver', { root: ['.'], extensions: ['.tsx', '.ts'] }],
    // Required by `jose` (transitive dep of @ajna-inc/openbadges) which uses
    // `export * as ns from '...'` syntax that React Native's babel preset
    // doesn't include by default.
    '@babel/plugin-transform-export-namespace-from',
    'react-native-reanimated/plugin',
  ],
}
