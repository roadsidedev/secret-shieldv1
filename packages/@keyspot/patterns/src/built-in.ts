import { Pattern } from './index.js';

export const builtInPatterns: Pattern[] = [
  {
    name: 'ethereum_private_key',
    regex: /\b(?:0x)?[a-fA-F0-9]{64}\b/g,
    severity: 'critical',
    description: 'Ethereum / EVM private keys'
  },
  {
    name: 'solana_private_key',
    regex: /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/g,
    severity: 'critical',
    description: 'Solana base58 private key'
  },
  {
    name: 'openai_api_key',
    regex: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'high',
    description: 'OpenAI API key'
  },
  {
    name: 'openai_org_key',
    regex: /org-[a-zA-Z0-9]{24}/g,
    severity: 'high',
    description: 'OpenAI organization key'
  },
  {
    name: 'openai_project_key',
    regex: /sk-proj-[a-zA-Z0-9]{52}/g,
    severity: 'high',
    description: 'OpenAI project API key'
  },
  {
    name: 'anthropic_api_key',
    regex: /sk-ant-api03-[a-zA-Z0-9_-]{86}-[a-zA-Z0-9_-]{8}/g,
    severity: 'high',
    description: 'Anthropic API key'
  },
  {
    name: 'google_ai_key',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    severity: 'high',
    description: 'Google AI / Gemini API key'
  },
  {
    name: 'cohere_api_key',
    regex: /\b[a-zA-Z0-9]{40}\b/g,
    severity: 'high',
    description: 'Cohere API key'
  },
  {
    name: 'huggingface_token',
    regex: /\bhf_[a-zA-Z0-9]{34,50}\b/g,
    severity: 'high',
    description: 'Hugging Face access token'
  },
  {
    name: 'replicate_api_key',
    regex: /\br8_[0-9A-Za-z]{37}\b/g,
    severity: 'high',
    description: 'Replicate API token'
  },
  {
    name: 'aws_access_key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: 'high',
    description: 'AWS Access Key ID'
  },
  {
    name: 'aws_secret_key',
    regex: /\b[0-9a-zA-Z\/+]{40}\b/g,
    severity: 'high',
    description: 'AWS Secret Access Key'
  },
  {
    name: 'aws_session_token',
    regex: /\bFQoGZXIvYXdzEB[0-9A-Za-z\/+]{100,200}\b/g,
    severity: 'high',
    description: 'AWS session token'
  },
  {
    name: 'gcp_service_account',
    regex: /["\']?type["\']?\s*:\s*["\']service_account["\']/g,
    severity: 'high',
    description: 'GCP service account key (JSON)'
  },
  {
    name: 'azure_connection_string',
    regex: /\bDefaultEndpointsProtocol=https;AccountName=[a-z0-9]+;AccountKey=[a-zA-Z0-9\/+]{86}==;EndpointSuffix=core\.windows\.net\b/g,
    severity: 'high',
    description: 'Azure storage connection string'
  },
  {
    name: 'digitalocean_token',
    regex: /\bdop_v1_[0-9a-f]{64}\b/g,
    severity: 'high',
    description: 'DigitalOcean personal access token'
  },
  {
    name: 'stripe_live_key',
    regex: /\b(sk_live|pk_live)_[0-9a-zA-Z]{24,34}\b/g,
    severity: 'high',
    description: 'Stripe live API key'
  },
  {
    name: 'stripe_test_key',
    regex: /\b(sk_test|pk_test)_[0-9a-zA-Z]{24,34}\b/g,
    severity: 'medium',
    description: 'Stripe test API key'
  },
  {
    name: 'twilio_sid',
    regex: /\bAC[a-zA-Z0-9]{32}\b/g,
    severity: 'high',
    description: 'Twilio Account SID'
  },
  {
    name: 'sendgrid_api_key',
    regex: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    severity: 'high',
    description: 'SendGrid API key'
  },
  {
    name: 'mailgun_api_key',
    regex: /\bkey-[0-9a-f]{32}\b/g,
    severity: 'high',
    description: 'Mailgun API key'
  },
  {
    name: 'mailchimp_api_key',
    regex: /\b[0-9a-f]{32}-us\d{1,2}\b/g,
    severity: 'high',
    description: 'Mailchimp API key'
  },
  {
    name: 'hubspot_api_key',
    regex: /\b[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\b/g,
    severity: 'high',
    description: 'HubSpot API key'
  },
  {
    name: 'slack_token',
    regex: /\bxox[bpaors]-[a-zA-Z0-9\-]{10,200}\b/g,
    severity: 'high',
    description: 'Slack API token'
  },
  {
    name: 'slack_webhook',
    regex: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9}\/[A-Z0-9]{9}\/[a-zA-Z0-9]{24}/g,
    severity: 'high',
    description: 'Slack webhook URL'
  },
  {
    name: 'discord_token',
    regex: /\b[a-zA-Z0-9_-]{24}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27}\b/g,
    severity: 'high',
    description: 'Discord bot token'
  },
  {
    name: 'github_token',
    regex: /\bghp_[a-zA-Z0-9]{36}\b/g,
    severity: 'high',
    description: 'GitHub personal access token'
  },
  {
    name: 'github_app_token',
    regex: /\bghs_[a-zA-Z0-9]{36}\b/g,
    severity: 'high',
    description: 'GitHub app installation token'
  },
  {
    name: 'gitlab_token',
    regex: /\bglpat-[a-zA-Z0-9\-_]{20,40}\b/g,
    severity: 'high',
    description: 'GitLab personal access token'
  },
  {
    name: 'npm_token',
    regex: /\bnpm_[a-zA-Z0-9]{36}\b/g,
    severity: 'high',
    description: 'npm access token'
  },
  {
    name: 'pagerduty_token',
    regex: /\bu\+[a-zA-Z0-9_]{20,30}\b/g,
    severity: 'high',
    description: 'PagerDuty API token'
  },
  {
    name: 'sentry_dsn',
    regex: /https:\/\/[a-f0-9]{64}@sentry\.io\/\d{4,20}/g,
    severity: 'medium',
    description: 'Sentry DSN'
  },
  {
    name: 'postgresql_url',
    regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}\/[a-zA-Z0-9_]+/g,
    severity: 'critical',
    description: 'PostgreSQL connection URL'
  },
  {
    name: 'mysql_url',
    regex: /mysql:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}\/[a-zA-Z0-9_]+/g,
    severity: 'critical',
    description: 'MySQL connection URL'
  },
  {
    name: 'mongodb_url',
    regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}\/[a-zA-Z0-9_]+/g,
    severity: 'critical',
    description: 'MongoDB connection URL'
  },
  {
    name: 'redis_url',
    regex: /redis:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?\/]+@[a-zA-Z0-9.\-]+:\d{4,5}/g,
    severity: 'high',
    description: 'Redis connection URL'
  },
  {
    name: 'rsa_private_key',
    regex: /-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'RSA private key (PEM)'
  },
  {
    name: 'ec_private_key',
    regex: /-----BEGIN EC PRIVATE KEY-----[\s\S]+?-----END EC PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Elliptic Curve private key (PEM)'
  },
  {
    name: 'ed25519_private_key',
    regex: /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Generic private key (PEM)'
  },
  {
    name: 'pgp_private_key',
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g,
    severity: 'critical',
    description: 'PGP private key block'
  },
  {
    name: 'ssh_private_key',
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]+?-----END OPENSSH PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'OpenSSH private key'
  },
  {
    name: 'jwt_token',
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    severity: 'medium',
    description: 'JWT token'
  },
  {
    name: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    severity: 'high',
    description: 'Credit card number (Luhn check recommended)'
  },
  {
    name: 'social_security_number',
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    severity: 'high',
    description: 'US Social Security Number'
  },
  {
    name: 'google_oauth_refresh',
    regex: /\b1\/\/[a-zA-Z0-9_-]{40,100}\b/g,
    severity: 'high',
    description: 'Google OAuth refresh token'
  },
  {
    name: 'firearbitrum_api_key',
    regex: /\bAIzaSy[a-zA-Z0-9_-]{26,35}\b/g,
    severity: 'high',
    description: 'Firearbitrum API key'
  },
  {
    name: 'firebase_url',
    regex: /https:\/\/[a-zA-Z0-9-]+\.firearbitrumio\.com/g,
    severity: 'medium',
    description: 'Firearbitrum database URL'
  },
  {
    name: 'heroku_api_key',
    regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g,
    severity: 'high',
    description: 'Heroku API key'
  },
  {
    name: 'docker_hub_token',
    regex: /\bdckr_pat_[a-zA-Z0-9_-]{20,60}\b/g,
    severity: 'high',
    description: 'Docker Hub personal access token'
  },
  {
    name: 'shopify_api_key',
    regex: /\bshpat_[a-f0-9]{32}\b/g,
    severity: 'high',
    description: 'Shopify access token'
  },
  {
    name: 'cloudflare_token',
    regex: /\b[0-9a-zA-Z_-]{40}\b/g,
    severity: 'high',
    description: 'Cloudflare API token'
  },
  {
    name: 'linear_api_key',
    regex: /\blin_api_[a-zA-Z0-9_-]{30,60}\b/g,
    severity: 'high',
    description: 'Linear API key'
  },
  {
    name: 'notion_api_key',
    regex: /\bsecret_[a-zA-Z0-9]{43}\b/g,
    severity: 'high',
    description: 'Notion integration token'
  },
  {
    name: 'dropbox_token',
    regex: /\bsl\.[a-zA-Z0-9\-_]{130,160}\b/g,
    severity: 'high',
    description: 'Dropbox access token'
  },
];
