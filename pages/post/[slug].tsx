import format from 'date-fns/format';
import hl from 'highlight.js';
import marked from 'marked';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { getPosts } from '../../utils/posts';

type PostProps =
  | { notFound: true }
  | {
      notFound?: false;
      slug: string;
      title: string;
      date: string;
      html: string;
    };

export const unstable_getStaticPaths = () => ({
  paths: getPosts().map(p => `/post/${p.slug}`),
});

export function unstable_getStaticProps({
  params,
}: {
  params: { slug: string };
}): { props: PostProps } {
  const { slug } = params;

  const post = getPosts().find(p => p.slug === slug);
  if (post == null) {
    return { props: { notFound: true } };
  }

  const { title, date, content } = post;
  return {
    props: {
      slug,
      title,
      date,
      html: marked(content, {
        highlight: function(code, lang) {
          return hl.highlight(lang, code).value;
        },
      }),
    },
  };
}

export default function Post(props: PostProps) {
  const { isFallback } = useRouter();
  if (
    // This branch can be removed when `unstable_getStaticPaths` includes the
    // `fallback: false` option.
    isFallback ||
    props.notFound
  ) {
    return (
      <Head>
        <meta httpEquiv="refresh" content="0;URL='/'" />
      </Head>
    );
  }

  const { slug, title, date, html } = props;
  return (
    <main className="page-content" aria-label="Content">
      <div className="wrapper">
        <article className="post h-entry">
          <header className="post-header">
            <Head>
              <title>{title}</title>
            </Head>
            <Link href="/">
              <a>&laquo; Back</a>
            </Link>
            <h1 className="post-title p-name" itemProp="name headline">
              {title}
            </h1>
            <p className="post-meta">
              <time
                className="dt-published"
                dateTime={date}
                itemProp="datePublished"
              >
                {format(new Date(date), 'MMM d, yyyy')}
              </time>
            </p>
          </header>

          <div
            className="post-content e-content"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div>

          <a className="u-url" href={`/post/${slug}`} hidden></a>

          <footer className="site-footer">
            <Link href="/">
              <a>&laquo; Back</a>
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
