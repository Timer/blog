import format from 'date-fns/format';
import hl from 'highlight.js';
import marked from 'marked';
import Head from 'next/head';
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

// Module state ... I know 🤷‍♂️
// Why? 👇 it's used in both path and props fns.
const posts = getPosts();

export const unstable_getStaticPaths = () => posts.map(p => `/post/${p.slug}`);

export function unstable_getStaticProps({
  params,
}: {
  params: { slug: string };
}): { props: PostProps } {
  const { slug } = params;

  const post = posts.find(p => p.slug === slug);
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
  if (props.notFound) {
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
        </article>
      </div>
    </main>
  );
}
