import ArticleEditor from "@/app/articles/[slug]/ArticleEditor";

export default async function Home(props: {
	params: Promise<{ slug: string }>;
}) {
	const params = await props.params;
	const slug = params.slug;

	return <ArticleEditor slug={slug} />;
}
