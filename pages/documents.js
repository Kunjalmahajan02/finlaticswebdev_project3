import Link from "next/link";
import prisma from "@/lib/db";
import { ensureSample } from "@/lib/sampleDoc";
import DocumentCard from "@/components/DocumentCard";

export async function getServerSideProps() {
  try {
    await ensureSample();
    const docs = await prisma.document.findMany({
      where: { status: "ready" },
      orderBy: [{ isSample: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, pageCount: true, chunkCount: true, tokenCount: true, isSample: true, createdAt: true },
      take: 60,
    });
    return { props: { docs: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) } };
  } catch (err) {
    console.error(err);
    return { props: { docs: [] } };
  }
}

export default function Documents({ docs }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-slate-400 mt-1">Every indexed PDF. Pick one to start chatting.</p>
        </div>
        <Link href="/" className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl">
          + Upload PDF
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className="text-slate-400">No documents yet. Upload the first one!</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <DocumentCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </>
  );
}
