import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Task {
  id: number | string;
  title?: string;
  description?: string;
  points?: number;
  category?: string;
  is_active?: boolean | number | string;
  available_from?: string;
  deadline?: string;
}

export default function TasksPage() {

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------
  // BUSCAR TAREFAS
  // -------------------------

  useEffect(() => {

    async function loadTasks() {
      try {

        const res = await fetch("/api/tasks");
        const data = await res.json();

        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          console.warn("API retornou algo inválido:", data);
          setTasks([]);
        }

      } catch (err) {
        console.error("Erro ao carregar tarefas:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();

  }, []);

  // -------------------------
  // FUNÇÕES DE DATA
  // -------------------------

  const isAvailable = (date?: string) => {
    if (!date) return true;

    const now = new Date();
    const availableDate = new Date(date);

    return now >= availableDate;
  };

  const isExpired = (date?: string) => {
    if (!date) return false;

    const now = new Date();
    const deadline = new Date(date);

    return now > deadline;
  };

  // -------------------------
  // FILTRAR TAREFAS
  // -------------------------

  const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter((t: Task) => {

    if (!t || typeof t !== "object") return false;

    const category = t.category || "";

    const isActive =
      t.is_active === true ||
      t.is_active === 1 ||
      t.is_active === "true";

    const available = isAvailable(t.available_from);
    const expired = isExpired(t.deadline);

    const categoryMatch =
      filter === "all" || category === filter;

    return categoryMatch && isActive && available && !expired;
  });

  // -------------------------
  // LOADING
  // -------------------------

  if (loading) {
    return (
      <div className="p-6 text-center">
        Carregando tarefas...
      </div>
    );
  }

  // -------------------------
  // TELA
  // -------------------------

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Tarefas disponíveis
      </h1>

      {/* FILTROS */}

      <div className="flex gap-2 flex-wrap">

        <Button onClick={() => setFilter("all")}>
          Todas
        </Button>

        <Button onClick={() => setFilter("CULTO")}>
          Culto
        </Button>

        <Button onClick={() => setFilter("CÉLULA")}>
          Célula
        </Button>

        <Button onClick={() => setFilter("DESAFIO")}>
          Desafio
        </Button>

        <Button onClick={() => setFilter("ESPECIAL")}>
          Especial
        </Button>

      </div>

      {/* LISTA DE TAREFAS */}

      {filteredTasks.length === 0 && (
        <div className="text-gray-500">
          Nenhuma tarefa disponível no momento.
        </div>
      )}

      <div className="grid gap-4">

        {(filteredTasks || []).map((task) => (

          <Card key={task.id || Math.random()}>

            <CardContent className="p-4 space-y-2">

              <h2 className="text-lg font-semibold">
                {task.title || "Tarefa"}
              </h2>

              <p className="text-sm text-gray-500">
                {task.description || "Sem descrição"}
              </p>

              <div className="text-sm font-medium">
                Pontos: {task.points ?? 0}
              </div>

              <Button>
                Enviar comprovação
              </Button>

            </CardContent>

          </Card>

        ))}

      </div>

    </div>
  );
}