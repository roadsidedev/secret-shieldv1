"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Copy, ExternalLink, GitBranch, BookOpen, CreditCard,
  Shield, Sparkles, FileSearch, Lock, Eye, Brain, Cpu
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "40+ Built-in Patterns",
    desc: "Detect API keys, crypto private keys, cloud credentials, DB URLs, JWTs, and more — across Web2 and Web3.",
  },
  {
    icon: Lock,
    title: "Vault & Replace",
    desc: "Secrets are replaced with HMAC-signed vault references. The agent never holds a raw secret.",
  },
  {
    icon: Sparkles,
    title: "Taint Tracking",
    desc: "Derived summaries, embeddings, or transformed copies of secrets are caught and redacted automatically.",
  },
  {
    icon: Eye,
    title: "PromptShield",
    desc: "18 jailbreak detection rules block prompt injection, system extraction, and tool abuse before they reach the LLM.",
  },
  {
    icon: Cpu,
    title: "Worker Isolation",
    desc: "Every scan runs in an isolated thread or V8 sandbox. Your main loop is never blocked or exposed.",
  },
  {
    icon: Shield,
    title: "Audit & Compliance",
    desc: "Hash-chained, Ed25519-signed audit logs. Optional block-timestamp correlation. Secrets are not written to audit payloads.",
  },
];

export default function KeySpotLanding() {
  const skillUrl = "https://raw.githubusercontent.com/roadsidedev/keyspot-sdk/main/SKILL.md";
  const [copiedNpm, setCopiedNpm] = useState(false);
  const [copiedSkill, setCopiedSkill] = useState(false);

  const handleCopyNpm = () => {
    navigator.clipboard.writeText("npm install @roadsidelab/keyspot-sdk");
    setCopiedNpm(true);
    setTimeout(() => setCopiedNpm(false), 2000);
  };

  const handleCopySkill = () => {
    navigator.clipboard.writeText(skillUrl);
    setCopiedSkill(true);
    setTimeout(() => setCopiedSkill(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold tracking-tight text-xl">KeySpot</div>
            <div className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-mono">SDK</div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/doc" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">Pricing</Link>
            <a href="https://github.com/roadsidedev/keyspot-sdk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
              GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-xs font-mono tracking-[2px] mb-6">
          RUNTIME SECURITY FOR AI AGENTS
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter leading-none mb-4">
          An agent should never hold<br />a secret longer than it needs to.
        </h1>

        <p className="max-w-md mx-auto text-lg text-zinc-600 dark:text-zinc-400 mt-6">
          Checkpoint → Scan → Vault → Replace → Continue. Enforced at every critical boundary.
        </p>

        {/* Install Command */}
        <div className="mt-10 max-w-lg mx-auto space-y-3">
          <div className="group relative flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-5 py-4 font-mono text-sm">
            <code className="flex-1 text-left">npm install @roadsidelab/keyspot-sdk</code>
            <button
              onClick={handleCopyNpm}
              className="opacity-60 group-hover:opacity-100 transition p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded relative"
              title="Copy to clipboard"
            >
              {copiedNpm ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400 absolute -top-8 right-0 whitespace-nowrap">Copied!</span>
              ) : null}
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span>or load the agent skill</span>
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          
          <div className="group relative flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-5 py-4 font-mono text-sm overflow-x-auto">
            <code className="flex-shrink-0 text-left whitespace-nowrap">{skillUrl}</code>
            <button
              onClick={handleCopySkill}
              className="opacity-60 group-hover:opacity-100 transition p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded flex-shrink-0 relative"
              title="Copy to clipboard"
            >
              {copiedSkill ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400 absolute -top-8 right-0 whitespace-nowrap">Copied!</span>
              ) : null}
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/doc"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 dark:bg-white px-6 text-sm font-medium text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <BookOpen className="mr-2 h-4 w-4" /> Read the docs
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 px-6 text-sm font-medium transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <CreditCard className="mr-2 h-4 w-4" /> View pricing
          </Link>
        </div>
      </div>

      {/* What it catches */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mb-6">COVERS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-sm">
            {[
              "OpenAI / Anthropic / Google / Cohere keys",
              "AWS, GCP, Azure cloud secrets",
              "Ethereum, Solana, PEM private keys",
              "Postgres, MySQL, Mongo, Redis URLs",
              "GitHub / GitLab / npm tokens",
              "Stripe / Twilio / SendGrid keys",
              "Slack, Discord, HubSpot, PagerDuty tokens",
              "JWT, Cloudflare, DigitalOcean, Notion tokens",
              "US SSNs and credit card numbers",
              "Docker Hub, Shopify, Linear, Dropbox tokens",
              "Firearbitrum, Heroku, Mailgun, Mailchimp keys",
              "Tainted derivations (summaries, embeddings)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                <div className="h-px w-4 bg-zinc-300 dark:bg-zinc-700 shrink-0" /> <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mb-8">WHY KEYSPOT</div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                      <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="font-medium text-sm">{f.title}</div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Supported platforms */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-xs uppercase tracking-[3px] text-zinc-500 dark:text-zinc-400 mb-8">WORKS WITH</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              "LangChain", "Anthropic SDK", "OpenAI SDK", "OpenClaw",
              "Hermes", "Manus", "Claude Code", "Express",
              "Pinecone", "Chroma", "Qdrant", "Weaviate",
              "LanceDB", "Milvus", "Docker (self-host)", "Python 3.10+",
            ].map((item) => (
              <div key={item} className="px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div>MIT License &bull; Open source</div>
          <a href="https://github.com/roadsidedev/keyspot-sdk" className="flex items-center gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300">
            <GitBranch className="h-3.5 w-3.5" /> roadsidedev/keyspot-sdk
          </a>
        </div>
      </footer>
    </div>
  );
}
