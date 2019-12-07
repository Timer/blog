import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  content: string;
};

export function getPosts(): BlogPost[] {
  // List Posts
  const postsDirectory = path.resolve(process.cwd(), '_posts');
  const postFiles = fs.readdirSync(postsDirectory);

  // Prepare posts off file system
  const posts = postFiles.map(fileName => {
    const fullPath = path.join(postsDirectory, fileName);
    const bytes = fs.readFileSync(fullPath, 'utf8');
    const {
      data: { slug, title, date },
      content,
    } = matter(bytes);
    return { slug, title, date, content };
  });

  return posts;
}
