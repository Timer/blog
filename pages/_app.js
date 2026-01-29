import { Analytics } from '@vercel/analytics/next';
import '../styles/minima.css';
import '../styles/syntax.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
