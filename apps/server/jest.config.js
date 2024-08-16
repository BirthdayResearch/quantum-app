module.exports = {
  preset: '@stickyjs/turbo-jest',
  testSequencer: require.resolve('./jest.sequencer'),
  projects: [
    {
      displayName: 'test:i9n',
      preset: '@stickyjs/turbo-jest',
      testRegex: '.*\\.i9n\\.ts$',
    },
  ],
};
