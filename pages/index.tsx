import format from 'date-fns/format';
import Link from 'next/link';
import React from 'react';
import { BlogPost, getPosts } from '../utils/posts';

export async function unstable_getStaticProps() {
  const sortedPosts = getPosts().sort((a, b) => a.date.localeCompare(b.date));
  return { props: { posts: sortedPosts } };
}

export default function Home({ posts }: { posts: BlogPost[] }) {
  return (
    <main className="page-content" aria-label="Content">
      <div className="wrapper">
        <div className="home">
          <h1 className="page-heading">timer.blog</h1>
          <h2 className="post-list-heading">Posts</h2>
          <ul className="post-list">
            {posts.map(post => (
              <li key={post.slug}>
                <span className="post-meta">
                  {format(new Date(post.date), 'MMM d, yyyy')}
                </span>
                <h3>
                  <Link href="/post/[slug]" as={`/post/${post.slug}`}>
                    <a className="post-link">{post.title}</a>
                  </Link>
                </h3>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
