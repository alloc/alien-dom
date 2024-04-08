import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface MarkdownPost {
  title: string;
  slug: string;
  content: string;
}

export async function getMarkdownPosts(): Promise<MarkdownPost[]> {
  const docsDir = path.join(process.cwd(), 'docs');
  const files = fs.readdirSync(docsDir);

  const posts = await Promise.all(
    files.map(async (file) => {
      if (file.endsWith('.md')) {
        const filePath = path.join(docsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        return {
          title: data.title,
          slug: file.replace('.md', ''),
          content,
        };
      }
    })
  );

  return posts.filter(Boolean) as MarkdownPost[];
}

export async function getMarkdownPost(slug: string): Promise<MarkdownPost | null> {
  const posts = await getMarkdownPosts();
  return posts.find((post) => post.slug === slug) || null;
}