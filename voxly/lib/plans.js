// Plans and prices (USD). The landing page shows the same numbers; a test keeps them in sync.
// Sized so a fully used plan still covers Claude costs (roughly $0.01–0.03 per visitor message
// with the default model) with a healthy margin.
const PLANS = {
  trial: { name: 'Free trial', monthly: 0, yearly: 0, messages: 300, pages: 30, branding: true },
  starter: { name: 'Starter', monthly: 49, yearly: 41, messages: 1000, pages: 30, branding: true },
  growth: { name: 'Growth', monthly: 129, yearly: 108, messages: 3000, pages: 100, branding: false },
  pro: { name: 'Pro', monthly: 399, yearly: 333, messages: 10000, pages: 100, branding: false },
  custom: { name: 'Custom', monthly: null, yearly: null, messages: null, pages: 100, branding: false },
};

const planOf = (key) => PLANS[key] || PLANS.starter;

module.exports = { PLANS, planOf };
