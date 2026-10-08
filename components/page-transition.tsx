// Names a page's content so it slides during navigation, while the header and
// page backgrounds stay put. Wrap each page's content in this (not a layout:
// layouts persist across navigations). The animation lives in globals.css and
// is started by navigateWithTransition() in lib/page-transition.ts.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ viewTransitionName: "page" }} className="vt-page flex flex-1 flex-col">
      {children}
    </div>
  );
}
