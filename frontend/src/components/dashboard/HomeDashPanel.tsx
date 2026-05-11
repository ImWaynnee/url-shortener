import UrlShortener from '@components/UrlShortener';

export function HomeDashPanel() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <UrlShortener />
    </div>
  );
}
