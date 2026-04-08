import ArticleEditor from "./ArticleEditor";

export default async function Page(props: {
	params: Promise<{ slug: string }>;
}) {
	const params = await props.params;
	const slug = params.slug;

	return <ArticleEditor slug={slug} />;
}
