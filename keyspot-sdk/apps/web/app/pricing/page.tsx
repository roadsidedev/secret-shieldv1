import Link from "next/link";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-semibold tracking-tighter">Simple pricing.<br />Powerful security.</h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Self-hosted is free forever. Hosted plans for teams that need managed keys and observability.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Self-hosted */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <div className="font-mono text-xs tracking-[2px] text-emerald-600 dark:text-emerald-400 mb-2">OPEN SOURCE</div>
            <div className="text-4xl font-semibold tracking-tighter">Free</div>
            <div className="text-sm text-zinc-500 mt-1">Forever</div>

            <ul className="mt-8 space-y-3 text-sm">
              <li>✓ Full SDK access</li>
              <li>✓ All vault adapters</li>
              <li>✓ Framework integrations</li>
              <li>✓ CLI + pre-commit hooks</li>
              <li>✓ Self-managed infrastructure</li>
            </ul>

            <a href="https://github.com/roadsidedev/keyspot-sdk" target="_blank" className="mt-8 block w-full rounded-full border border-zinc-200 dark:border-zinc-800 py-3 text-center text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition">
              View on GitHub
            </a>
          </div>

          {/* Hosted */}
          <div className="rounded-2xl border-2 border-zinc-950 dark:border-white p-8 relative">
            <div className="absolute -top-3 right-6 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs px-3 py-1 rounded font-mono tracking-widest">RECOMMENDED</div>

            <div className="font-mono text-xs tracking-[2px] text-amber-600 dark:text-amber-400 mb-2">HOSTED</div>
            <div className="text-4xl font-semibold tracking-tighter">From $20<span className="text-arbitrum align-super font-normal text-zinc-500">/mo</span></div>

            <ul className="mt-8 space-y-3 text-sm">
              <li>✓ Hosted vault + key management</li>
              <li>✓ Usage metrics &amp; audit logs</li>
              <li>✓ API key provisioning</li>
              <li>✓ Priority support</li>
              <li>✓ SOC2 / HIPAA ready</li>
            </ul>

            <Link href="/pricing#dashboard" className="mt-8 block w-full rounded-full bg-zinc-950 dark:bg-white py-3 text-center text-sm font-medium text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition">
              Get API keys
            </Link>
          </div>
        </div>

        <div id="dashboard" className="mt-16 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
            Go to dashboard → <span className="font-mono text-xs">Obtain keys &amp; view metrics</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
