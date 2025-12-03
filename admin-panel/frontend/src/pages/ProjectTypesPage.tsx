import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminProjectTypes } from "@/hooks/useAdminProjectTypes";
import { ProjectType, BudgetRange, TimelineOption } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, DollarSign, Clock, X } from "lucide-react";

export default function ProjectTypesPage() {
  const { projectTypes, isLoading, createProjectType, updateProjectType, deleteProjectType } = useAdminProjectTypes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProjectType | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    budgetRanges: [] as BudgetRange[],
    timelines: [] as TimelineOption[],
    features: [] as string[],
    isActive: true,
    sortOrder: 0,
  });

  const [newBudget, setNewBudget] = useState({ label: "", minAmount: "", maxAmount: "", isCustom: false });
  const [newTimeline, setNewTimeline] = useState({ label: "", minDays: "", maxDays: "", isCustom: false });
  const [newFeature, setNewFeature] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      budgetRanges: [],
      timelines: [],
      features: [],
      isActive: true,
      sortOrder: 0,
    });
    setEditingType(null);
    setNewBudget({ label: "", minAmount: "", maxAmount: "", isCustom: false });
    setNewTimeline({ label: "", minDays: "", maxDays: "", isCustom: false });
    setNewFeature("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (type: ProjectType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      budgetRanges: type.budgetRanges || [],
      timelines: type.timelines || [],
      features: type.features || [],
      isActive: type.isActive,
      sortOrder: type.sortOrder,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      budgetRanges: formData.budgetRanges.map(b => ({
        ...b,
        minAmount: Number(b.minAmount),
        maxAmount: Number(b.maxAmount),
      })),
      timelines: formData.timelines.map(t => ({
        ...t,
        minDays: Number(t.minDays),
        maxDays: Number(t.maxDays),
      })),
    };

    if (editingType) {
      updateProjectType.mutate({ id: editingType._id, data });
    } else {
      createProjectType.mutate(data);
    }
    setIsFormOpen(false);
    resetForm();
  };

  const addBudgetRange = () => {
    if (!newBudget.label || !newBudget.minAmount || !newBudget.maxAmount) return;
    setFormData({
      ...formData,
      budgetRanges: [...formData.budgetRanges, {
        label: newBudget.label,
        minAmount: Number(newBudget.minAmount),
        maxAmount: Number(newBudget.maxAmount),
        isCustom: newBudget.isCustom,
      }],
    });
    setNewBudget({ label: "", minAmount: "", maxAmount: "", isCustom: false });
  };

  const removeBudgetRange = (index: number) => {
    setFormData({
      ...formData,
      budgetRanges: formData.budgetRanges.filter((_, i) => i !== index),
    });
  };

  const addTimeline = () => {
    if (!newTimeline.label || !newTimeline.minDays || !newTimeline.maxDays) return;
    setFormData({
      ...formData,
      timelines: [...formData.timelines, {
        label: newTimeline.label,
        minDays: Number(newTimeline.minDays),
        maxDays: Number(newTimeline.maxDays),
        isCustom: newTimeline.isCustom,
      }],
    });
    setNewTimeline({ label: "", minDays: "", maxDays: "", isCustom: false });
  };

  const removeTimeline = (index: number) => {
    setFormData({
      ...formData,
      timelines: formData.timelines.filter((_, i) => i !== index),
    });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setFormData({
      ...formData,
      features: [...formData.features, newFeature.trim()],
    });
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleDelete = (type: ProjectType) => {
    if (confirm(`Are you sure you want to delete "${type.name}"?`)) {
      deleteProjectType.mutate(type._id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Project Types</h1>
            <p className="text-muted-foreground">Manage project types with custom budgets and timelines</p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project Type
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectTypes.map((type) => (
              <Card key={type._id} className={!type.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      {!type.isActive && <Badge variant="secondary" className="mt-1">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(type)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(type)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {type.description && (
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  )}
                  
                  {type.budgetRanges && type.budgetRanges.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" /> Budget Ranges
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {type.budgetRanges.map((b, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {type.timelines && type.timelines.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" /> Timelines
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {type.timelines.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {t.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit Project Type" : "Add Project Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., E-Commerce Store"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this project type"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(c) => setFormData({ ...formData, isActive: !!c })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              {/* Budget Ranges */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Budget Ranges</Label>
                <div className="mt-2 space-y-2">
                  {formData.budgetRanges.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted p-2 rounded">
                      <span className="flex-1 text-sm">{b.label} (${b.minAmount} - ${b.maxAmount})</span>
                      {b.isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeBudgetRange(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Label"
                    value={newBudget.label}
                    onChange={(e) => setNewBudget({ ...newBudget, label: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Min $"
                    value={newBudget.minAmount}
                    onChange={(e) => setNewBudget({ ...newBudget, minAmount: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max $"
                    value={newBudget.maxAmount}
                    onChange={(e) => setNewBudget({ ...newBudget, maxAmount: e.target.value })}
                  />
                  <Button type="button" variant="outline" onClick={addBudgetRange}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Timelines */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Timelines</Label>
                <div className="mt-2 space-y-2">
                  {formData.timelines.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted p-2 rounded">
                      <span className="flex-1 text-sm">{t.label} ({t.minDays} - {t.maxDays} days)</span>
                      {t.isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeTimeline(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Label"
                    value={newTimeline.label}
                    onChange={(e) => setNewTimeline({ ...newTimeline, label: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Min days"
                    value={newTimeline.minDays}
                    onChange={(e) => setNewTimeline({ ...newTimeline, minDays: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max days"
                    value={newTimeline.maxDays}
                    onChange={(e) => setNewTimeline({ ...newTimeline, maxDays: e.target.value })}
                  />
                  <Button type="button" variant="outline" onClick={addTimeline}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Features */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Common Features</Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeFeature(i)} />
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" variant="outline" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={createProjectType.isPending || updateProjectType.isPending}>
                {(createProjectType.isPending || updateProjectType.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingType ? "Update Project Type" : "Create Project Type"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
