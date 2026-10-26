import Head from "next/head";
import Header from "@/components/Header";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>DocChat · Chat with any PDF (RAG)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Upload a PDF and ask questions about it. Answers stream in with source citations, powered by a RAG pipeline with pgvector."
        />
      </Head>
      <Header />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <Component {...pageProps} />
      </main>
      <footer className="max-w-5xl mx-auto px-5 pb-10 text-center text-xs text-slate-500">
        Built by Kunjal Mahajan · Next.js · pdf-parse · Gemini embeddings · Supabase pgvector · Groq
      </footer>
    </>
  );
}
