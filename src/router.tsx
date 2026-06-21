import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function isBrowser() {
  return typeof window !== "undefined";
}

async function notifyError(message: string) {
  if (!isBrowser()) return;
  try {
    const { toast } = await import("sonner");
    toast.error(message);
  } catch {
    // sonner not available during SSR — ignore
  }
}

function extractMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only toast on background refetches to avoid duplicating route error UI
        if (query.state.data !== undefined) {
          notifyError(extractMessage(error, "Erro ao atualizar dados"));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        // Skip when the mutation has its own onError handler
        if (mutation.options.onError) return;
        notifyError(extractMessage(error, "Erro ao salvar alterações"));
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
