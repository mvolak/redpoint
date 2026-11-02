import { ButtonLink, Container } from "@redcord/ui";

export default function NotFound() {
  return (
    <Container className="py-24">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">Chyba 404</p>
      <h1 className="mt-4 text-display font-bold">Stránku jsme nenašli</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Stránka mohla být přesunuta při obnově webu. Zkuste vyhledávání nebo pokračujte na hlavní rozcestníky.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/hledat/">Hledat</ButtonLink>
        <ButtonLink href="/vybaveni/" variant="outline-dark">
          Vybavení
        </ButtonLink>
        <ButtonLink href="/vzdelavani/" variant="outline-dark">
          Vzdělávání
        </ButtonLink>
        <ButtonLink href="/kontakt/" variant="outline-dark">
          Kontakt
        </ButtonLink>
      </div>
    </Container>
  );
}
