"use client";
import { useState } from "react";

interface Lead {
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin: string;
  description: string;
  fit_score: number;
}

export default function Home() {
  const [industry, setIndustry] = useState("B2B SaaS");
  const [stage, setStage] = useState("Seed to Series A");
  const [location, setLocation] = useState("USA");
  const [count, setCount] = useState(5);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<Record<number, string>>({});

  async function discover() {
    setLoading(true);
    setLeads([]);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, stage, location, count }),
      });
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      alert("Discover failed: " + e);
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail(lead: Lead, idx: number) {
    setEmailStatus((s) => ({ ...s, [idx]: "sending" }));
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email,
          subject: `Quick intro — relevant to ${lead.company}`,
          body: `Hi ${lead.name.split(" ")[0]},\n\nI came across ${lead.company} and was impressed by what you're building.\n\nWould love to connect — do you have 15 min this week?\n\nBest,\nFounder Outreach`,
        }),
      });
      if (res.ok) {
        setEmailStatus((s) => ({ ...s, [idx]: "sent" }));
      } else {
        setEmailStatus((s) => ({ ...s, [idx]: "error" }));
      }
    } catch {
      setEmailStatus((s) => ({ ...s, [idx]: "error" }));
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">Founder Outreach</h1>
        <p className="text-gray-400 mb-8">AI-powered lead discovery + Gmail outreach</p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Discover Leads</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Industry</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stage</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Location</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Count</label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
          </div>
          <button
            onClick={discover}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            {loading ? "Discovering..." : "Discover Leads"}
          </button>
        </div>

        {leads.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">{leads.length} Leads Found</h2>
            <div className="space-y-4">
              {leads.map((lead, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-white">{lead.name}</span>
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                        {lead.fit_score}% fit
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-1">
                      {lead.title} @ {lead.company}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{lead.description}</div>
                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>{lead.email}</span>
                      <a
                        href={lead.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        LinkedIn
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => sendEmail(lead, idx)}
                    disabled={emailStatus[idx] === "sending" || emailStatus[idx] === "sent"}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      emailStatus[idx] === "sent"
                        ? "bg-green-800 text-green-300"
                        : emailStatus[idx] === "error"
                        ? "bg-red-800 text-red-300"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                    }`}
                  >
                    {emailStatus[idx] === "sending"
                      ? "Sending..."
                      : emailStatus[idx] === "sent"
                      ? "Sent ✓"
                      : emailStatus[idx] === "error"
                      ? "Failed ✗"
                      : "Send Email"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
