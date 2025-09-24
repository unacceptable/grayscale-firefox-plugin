/**
 * Unit Tests for Wildcard Domain Matching
 */

module.exports = function(runner) {
  // Import the wildcard matching functions (simulating the extension code)
  function matchesWhitelistPattern(hostname, pattern) {
    // Direct match
    if (hostname === pattern) {
      return true;
    }

    // Wildcard pattern matching
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2); // Remove "*."
      // Match exact domain or any subdomain
      return hostname === domain || hostname.endsWith('.' + domain);
    }

    return false;
  }

  function isWhitelisted(hostname, whitelist) {
    return whitelist.some(pattern => matchesWhitelistPattern(hostname, pattern));
  }

  function validateDomainPattern(pattern) {
    // Basic domain validation
    const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(pattern);
  }

  runner.suite('Wildcard Domain Matching', () => {

    runner.test('Direct domain matching', () => {
      runner.assertTrue(matchesWhitelistPattern('example.com', 'example.com'));
      runner.assertFalse(matchesWhitelistPattern('google.com', 'example.com'));
      runner.assertFalse(matchesWhitelistPattern('sub.example.com', 'example.com'));
    });

    runner.test('Wildcard subdomain matching', () => {
      runner.assertTrue(matchesWhitelistPattern('sub.example.com', '*.example.com'));
      runner.assertTrue(matchesWhitelistPattern('deep.sub.example.com', '*.example.com'));
      runner.assertTrue(matchesWhitelistPattern('api.github.com', '*.github.com'));
      runner.assertFalse(matchesWhitelistPattern('notexample.com', '*.example.com'));
      runner.assertFalse(matchesWhitelistPattern('example.com.evil.com', '*.example.com'));
    });

    runner.test('Wildcard root domain matching', () => {
      runner.assertTrue(matchesWhitelistPattern('example.com', '*.example.com'));
      runner.assertTrue(matchesWhitelistPattern('github.com', '*.github.com'));
      runner.assertTrue(matchesWhitelistPattern('atlassian.net', '*.atlassian.net'));
    });

    runner.test('Real-world examples', () => {
      // Atlassian
      runner.assertTrue(matchesWhitelistPattern('confluence.atlassian.net', '*.atlassian.net'));
      runner.assertTrue(matchesWhitelistPattern('jira.atlassian.net', '*.atlassian.net'));
      runner.assertTrue(matchesWhitelistPattern('atlassian.net', '*.atlassian.net'));
      runner.assertFalse(matchesWhitelistPattern('notatlassian.net', '*.atlassian.net'));

      // GitHub
      runner.assertTrue(matchesWhitelistPattern('github.com', '*.github.com'));
      runner.assertTrue(matchesWhitelistPattern('api.github.com', '*.github.com'));
      runner.assertTrue(matchesWhitelistPattern('gist.github.com', '*.github.com'));
      runner.assertFalse(matchesWhitelistPattern('github.io', '*.github.com'));
      runner.assertFalse(matchesWhitelistPattern('raw.githubusercontent.com', '*.github.com'));

      // Google
      runner.assertTrue(matchesWhitelistPattern('mail.google.com', '*.google.com'));
      runner.assertTrue(matchesWhitelistPattern('docs.google.com', '*.google.com'));
      runner.assertTrue(matchesWhitelistPattern('drive.google.com', '*.google.com'));
    });

    runner.test('Whitelist array matching', () => {
      const whitelist1 = ['*.github.com', 'example.com', 'google.com'];
      runner.assertTrue(isWhitelisted('api.github.com', whitelist1));
      runner.assertTrue(isWhitelisted('example.com', whitelist1));
      runner.assertTrue(isWhitelisted('google.com', whitelist1));
      runner.assertFalse(isWhitelisted('facebook.com', whitelist1));

      const whitelist2 = ['*.atlassian.net', '*.github.com'];
      runner.assertTrue(isWhitelisted('confluence.atlassian.net', whitelist2));
      runner.assertTrue(isWhitelisted('gist.github.com', whitelist2));
      runner.assertFalse(isWhitelisted('stackoverflow.com', whitelist2));
    });

    runner.test('Edge cases', () => {
      // Empty patterns
      runner.assertFalse(matchesWhitelistPattern('example.com', ''));
      runner.assertFalse(matchesWhitelistPattern('', 'example.com'));
      runner.assertTrue(matchesWhitelistPattern('', ''));

      // Special characters in domains
      runner.assertTrue(matchesWhitelistPattern('test-site.example.com', '*.example.com'));
      runner.assertTrue(matchesWhitelistPattern('api-v2.github.com', '*.github.com'));

      // Case sensitivity (domains should be normalized to lowercase)
      runner.assertTrue(matchesWhitelistPattern('Example.com'.toLowerCase(), 'example.com'));
      runner.assertTrue(matchesWhitelistPattern('API.GitHub.com'.toLowerCase(), '*.github.com'));
    });

    runner.test('Pattern validation', () => {
      // Valid patterns
      runner.assertTrue(validateDomainPattern('example.com'));
      runner.assertTrue(validateDomainPattern('*.example.com'));
      runner.assertTrue(validateDomainPattern('sub.domain.com'));
      runner.assertTrue(validateDomainPattern('*.very-long-domain-name.co.uk'));

      // Invalid patterns
      runner.assertFalse(validateDomainPattern(''));
      runner.assertFalse(validateDomainPattern('*.'));
      runner.assertFalse(validateDomainPattern('*'));
      runner.assertFalse(validateDomainPattern('.example.com'));
      runner.assertFalse(validateDomainPattern('example.'));
      runner.assertFalse(validateDomainPattern('*.*.example.com'));
    });

    runner.test('Security considerations', () => {
      // Prevent malicious patterns
      runner.assertFalse(matchesWhitelistPattern('evil.com', '*.'));
      runner.assertFalse(matchesWhitelistPattern('anything.com', '*'));

      // Ensure exact matching prevents bypasses
      runner.assertFalse(matchesWhitelistPattern('evilexample.com', 'example.com'));
      runner.assertFalse(matchesWhitelistPattern('example.com.evil.com', '*.example.com'));
    });

    runner.test('Performance with large whitelists', () => {
      // Create a large whitelist
      const largeWhitelist = [];
      for (let i = 0; i < 1000; i++) {
        largeWhitelist.push(`site${i}.com`);
        largeWhitelist.push(`*.domain${i}.com`);
      }

      const start = Date.now();
      const result = isWhitelisted('site500.com', largeWhitelist);
      const end = Date.now();

      runner.assertTrue(result);
      runner.assertTrue(end - start < 100, `Performance test took ${end - start}ms, should be < 100ms`);
    });
  });
};
