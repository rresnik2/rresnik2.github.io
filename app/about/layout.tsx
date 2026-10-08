export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 h-lvh -z-10 bg-paper" />
      {children}
    </>
  );
}
