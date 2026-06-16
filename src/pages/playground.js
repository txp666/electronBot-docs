import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getMessages } from '@site/src/components/ElectronDebugger/messages';

export default function Playground() {
  const lang = 'zh';
  const t = getMessages(lang);

  return (
    <Layout title={t.pageTitle} description={t.pageIntro}>
      <main style={{ padding: '28px 0 0' }}>
        <div style={{ maxWidth: 1560, margin: '0 auto', padding: '0 20px 10px' }}>
          <h1 style={{ marginBottom: 6, fontSize: '1.9rem' }}>{t.pageTitle}</h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)', marginBottom: 18 }}>{t.pageIntro}</p>
        </div>
        <BrowserOnly fallback={<div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>}>
          {() => {
            const ElectronDebugger = require('@site/src/components/ElectronDebugger').default;
            return <ElectronDebugger lang={lang} />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
