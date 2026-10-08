// Empty room after a page's content on pages with a background photo, so the
// visitor can scroll the panel away and see the whole image (the backdrop is
// fixed to the screen, so it stays put while the page scrolls)
export default function BackdropSpace() {
  return <div aria-hidden="true" className="h-svh shrink-0" />;
}
