import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminTasks } from "@/hooks/useAdminTasks";
import { useAdminCustomOrders } from "@/hooks/useAdminCustomOrders";
import { Task, Subtask } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit, Trash2, Loader2, CheckCircle2, Circle, Clock, 
  AlertTriangle, X, Calendar, User, ListTodo
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  todo: { label: "To Do", color: "bg-slate-500/20 text-slate-400", icon: Circle },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: Clock },
  review: { label: "Review", color: "bg-purple-500/20 text-purple-400", icon: AlertTriangle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-500/20 text-slate-400" },
  normal: { label: "Normal", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-400" },
};

export default function TasksPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { tasks, isLoading, createTask, updateTask, deleteTask, toggleSubtask } = useAdminTasks(selectedOrderId || undefined);
  const { orders } = useAdminCustomOrders();

  const [formData, setFormData] = useState({
    orderId: "",
    title: "",
    description: "",
    status: "todo" as Task["status"],
    priority: "normal" as Task["priority"],
    assignedTo: "",
    dueDate: "",
    estimatedHours: "",
    subtasks: [] as Subtask[],
    tags: [] as string[],
  });

  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");

  const filteredTasks = statusFilter 
    ? tasks.filter(t => t.status === statusFilter)
    : tasks;

  const resetForm = () => {
    setFormData({
      orderId: selectedOrderId || "",
      title: "",
      description: "",
      status: "todo",
      priority: "normal",
      assignedTo: "",
      dueDate: "",
      estimatedHours: "",
      subtasks: [],
      tags: [],
    });
    setEditingTask(null);
    setNewSubtask("");
    setNewTag("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    const orderId = typeof task.orderId === "object" ? task.orderId._id : task.orderId;
    setFormData({
      orderId,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo || "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      estimatedHours: task.estimatedHours?.toString() || "",
      subtasks: task.subtasks || [],
      tags: task.tags || [],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.orderId) return;

    const data: any = {
      orderId: formData.orderId,
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status,
      priority: formData.priority,
      assignedTo: formData.assignedTo || undefined,
      dueDate: formData.dueDate || undefined,
      estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
      subtasks: formData.subtasks,
      tags: formData.tags,
    };

    if (editingTask) {
      updateTask.mutate({ id: editingTask._id, data });
    } else {
      createTask.mutate(data);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setFormData({
      ...formData,
      subtasks: [...formData.subtasks, { title: newSubtask.trim(), isCompleted: false }],
    });
    setNewSubtask("");
  };

  const removeSubtask = (index: number) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()],
    });
    setNewTag("");
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  const handleDelete = (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteTask.mutate(task._id);
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    toggleSubtask.mutate({ taskId, subtaskId });
  };

  const getOrderDisplay = (orderId: Task["orderId"]) => {
    if (typeof orderId === "object") {
      return `${orderId.orderId} - ${orderId.clientName}`;
    }
    const order = orders.find(o => o._id === orderId);
    return order ? `${order.orderId} - ${order.clientName}` : orderId;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Project Tasks</h1>
            <p className="text-muted-foreground">Manage tasks for custom order projects</p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {orders.map(order => (
                    <SelectItem key={order._id} value={order._id}>
                      {order.orderId} - {order.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ListTodo className="h-12 w-12 mb-4" />
              <p>No tasks found</p>
              <Button variant="outline" className="mt-4" onClick={openCreateForm}>
                Create your first task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => {
              const StatusIcon = statusConfig[task.status].icon;
              const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
              const totalSubtasks = task.subtasks?.length || 0;

              return (
                <Card key={task._id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{task.title}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {getOrderDisplay(task.orderId)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(task)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(task)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusConfig[task.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[task.status].label}
                      </Badge>
                      <Badge className={priorityConfig[task.priority].color}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                    </div>

                    {totalSubtasks > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Subtasks</span>
                          <span>{completedSubtasks}/{totalSubtasks}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </div>
                      )}
                      {task.assignedTo && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignedTo}
                        </div>
                      )}
                    </div>

                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project *</Label>
                <Select value={formData.orderId} onValueChange={(v) => setFormData({ ...formData, orderId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map(order => (
                      <SelectItem key={order._id} value={order._id}>
                        {order.orderId} - {order.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: Task["status"]) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: Task["priority"]) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned To</Label>
                  <Input
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="Team member"
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="8"
                />
              </div>

              {/* Subtasks */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Subtasks</Label>
                <div className="mt-2 space-y-2">
                  {formData.subtasks.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted p-2 rounded">
                      <Checkbox checked={s.isCompleted} disabled />
                      <span className={`flex-1 text-sm ${s.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                        {s.title}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubtask(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add subtask"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                  />
                  <Button type="button" variant="outline" onClick={addSubtask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Tags</Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(i)} />
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={createTask.isPending || updateTask.isPending}>
                {(createTask.isPending || updateTask.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
