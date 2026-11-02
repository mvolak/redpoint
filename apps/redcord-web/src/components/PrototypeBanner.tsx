import Link from "next/link";

/** Persistent review-mode label. Never rendered in production. */
export function PrototypeBanner() {
  return (
    <div role="note" className="bg-warn-bg text-[#4d3500]">
      <p className="mx-auto max-w-content px-5 py-2 text-center text-sm md:px-8 lg:px-12">
        <strong>Koncept k revizi vlastníkem.</strong> Obsah není schválen, formuláře jsou v testovacím režimu a nic neodesílají.{" "}
        <Link href="/o-nas/#prototyp" className="font-semibold underline underline-offset-2">
          Co je skutečné a co ne
        </Link>
      </p>
    </div>
  );
}
