import React from 'react'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import format from 'date-fns/format'

export async function unstable_getStaticProps() {
  const postsDirectory = path.resolve(process.cwd(), '_posts')
  const posts = fs
    .readdirSync(postsDirectory)
    .map(fileName => {
      const fullPath = path.join(postsDirectory, fileName)
      const content = fs.readFileSync(fullPath, 'utf8')
      const {
        data: { slug, title, date },
      } = matter(content)
      return { slug, title, date }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  return { props: { posts }, revalidate: false }
}

export default function Home({ posts }) {
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
  )
}
