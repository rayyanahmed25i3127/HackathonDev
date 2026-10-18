'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>Let’s try that again.</h1>
      <p>Something interrupted this page. Please refresh and try again.</p>
      <button className="btn btn-primary" onClick={reset}>
        Reload this view
      </button>
    </main>
  );
}
