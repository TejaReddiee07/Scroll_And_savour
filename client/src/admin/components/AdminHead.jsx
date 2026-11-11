import { useEffect } from 'react';

/**
 * <title> + robots meta for every admin screen (React 19 hoists these into <head>).
 * Also makes sure the public site's custom cursor class never hides the pointer here.
 */
export function AdminHead() {
  useEffect(() => {
    document.documentElement.classList.remove('has-custom-cursor');
  }, []);

  return (
    <>
      <title>Admin · Fuji</title>
      <meta name="robots" content="noindex, nofollow" />
    </>
  );
}
