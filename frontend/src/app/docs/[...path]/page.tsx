"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { ArrowLeft, Download, ExternalLink } from "@/lib/icons";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function DocsPage() {
  const params = useParams();
  const filePath = Array.isArray(params.path)
    ? params.path.join("/")
    : params.path || "";
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/docs/${filePath}.md`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Fichier non trouvé");
          } else {
            setError(`Erreur ${response.status}: ${response.statusText}`);
          }
          return;
        }

        const text = await response.text();
        setContent(text);
      } catch (err: any) {
        setError(`Erreur lors du chargement: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      fetchContent();
    }
  }, [filePath]);

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filePath.split("/").pop() || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/b4ck0ff1ce/user-journey">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">📄 Documentation</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {filePath}
              </p>
            </div>
          </div>
          {content && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <a
                href={`/api/docs/${filePath}.md`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir brut
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  Chargement de la documentation...
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 text-xl mb-2">❌ {error}</div>
                <p className="text-gray-600">
                  Le fichier demandé n'a pas pu être chargé.
                </p>
              </div>
            )}

            {!loading && !error && content && (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"h1">) => (
                      <h1
                        className="text-4xl font-bold mb-4 mt-8 border-b-2 border-blue-500 pb-2"
                        {...props}
                      />
                    ),
                    h2: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"h2">) => (
                      <h2
                        className="text-3xl font-semibold mb-3 mt-6 border-b border-gray-300 dark:border-gray-700 pb-2"
                        {...props}
                      />
                    ),
                    h3: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"h3">) => (
                      <h3
                        className="text-2xl font-semibold mb-2 mt-4"
                        {...props}
                      />
                    ),
                    code: ({ node, className, children, ...props }: any) => {
                      const isInline = !className;
                      return isInline ? (
                        <code
                          className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"pre">) => (
                      <pre
                        className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"
                        {...props}
                      />
                    ),
                    a: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"a">) => (
                      <a
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        {...props}
                      />
                    ),
                    table: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"table">) => (
                      <div className="overflow-x-auto my-4">
                        <table
                          className="min-w-full border-collapse border border-gray-300 dark:border-gray-700"
                          {...props}
                        />
                      </div>
                    ),
                    th: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"th">) => (
                      <th
                        className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold"
                        {...props}
                      />
                    ),
                    td: ({
                      node: _node,
                      ...props
                    }: { node?: unknown } & ComponentProps<"td">) => (
                      <td
                        className="border border-gray-300 dark:border-gray-700 px-4 py-2"
                        {...props}
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
