import Link from "next/link";
import { useRouter } from "next/router";
import { SAMPLE_ID } from "@/lib/sampleIds";

const LINKS = [
  ["/", "Upload"],
  ["/documents", "Documents"],
  [`/chat/${SAMPLE_ID}`, "Try sample"],
];

export default function Header() {
  const { asPath } = useRouter();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <nav className="max-w-5xl mx-auto px-5 min-h-16 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href="/" className="font-bold text-lg whitespace-nowrap">
          📚 Doc<span className="text-indigo-400">Chat</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`${href === "/" ? "hidden sm:inline-block" : ""} px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ${
                asPath === href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
