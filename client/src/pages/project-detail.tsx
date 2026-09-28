import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { calculateLayout, MATERIAL_PRESETS, PATTERN_INFO, type LayoutParams } from "@/lib/layout-engine";
import LayoutCanvas from "@/components/layout-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Crown, Lock, Ruler, Calculator, DollarSign, Layers, Scissors } from "lucide-react";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id);
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showAddRoom, setShowAddRoom] = useState(false);

  const isFree = user?.plan === "free";

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ["/api/projects", projectId],
  });

  // Fetch rooms
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "rooms"],
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rooms"] });
      toast({ title: "Room deleted" });
    },
  });

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{project.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {isFree && (
              <Link href="/pricing">
                <Button size="sm" variant="outline">
                  <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Project info */}
        <div className="mb-6">
          {project.clientName && (
            <p className="text-sm text-muted-foreground">Client: {project.clientName}</p>
          )}
          {project.clientAddress && (
            <p className="text-sm text-muted-foreground">{project.clientAddress}</p>
          )}
          {project.notes && (
            <p className="text-sm text-muted-foreground mt-1 italic">{project.notes}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Rooms</h2>
          <Button onClick={() => setShowAddRoom(true)} data-testid="button-add-room">
            <Plus className="w-4 h-4 mr-1" /> Add Room
          </Button>
        </div>

        {roomsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Layers className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">No rooms yet. Add your first room to start designing.</p>
              <Button onClick={() => setShowAddRoom(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {rooms.map((room: any) => (
              <RoomDesigner
                key={room.id}
                room={room}
                projectId={projectId}
                isFree={isFree}
                onDelete={() => {
                  if (confirm("Delete this room?")) deleteRoom.mutate(room.id);
                }}
                token={token}
              />
            ))}
          </div>
        )}
      </div>

      <AddRoomDialog
        open={showAddRoom}
        onOpenChange={setShowAddRoom}
        projectId={projectId}
        isFree={isFree}
        token={token}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rooms"] });
        }}
      />
    </div>
  );
}

// ─── Room Designer Component ───
function RoomDesigner({ room, projectId, isFree, onDelete, token }: {
  room: any;
  projectId: number;
  isFree: boolean;
  onDelete: () => void;
  token: string | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [width, setWidth] = useState(room.width || 12);
  const [length, setLength] = useState(room.length || 12);
  const [name, setName] = useState(room.name || "Room");
  const [materialType, setMaterialType] = useState(room.materialType || "plank");
  const [pattern, setPattern] = useState(room.pattern || "straight");
  const [wasteFactor, setWasteFactor] = useState(room.wasteFactor || 10);
  const [pricePerSqft, setPricePerSqft] = useState(room.pricePerSqft || 4.50);
  const [laborPerSqft, setLaborPerSqft] = useState(room.laborPerSqft || 3.50);
  const [materialWidth, setMaterialWidth] = useState(room.materialWidth || 5);
  const [materialLength, setMaterialLength] = useState(room.materialLength || 48);

  const updateRoom = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/rooms/${room.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "rooms"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Auto-save on changes (debounced via effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateRoom.mutate({
        name, width, length, materialType, pattern, wasteFactor, pricePerSqft, laborPerSqft, materialWidth, materialLength,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, width, length, materialType, pattern, wasteFactor, pricePerSqft, laborPerSqft, materialWidth, materialLength]);

  const layoutResult = useMemo(() => {
    return calculateLayout({
      roomWidth: width,
      roomLength: length,
      materialWidth,
      materialLength,
      pattern,
      wasteFactor,
      pricePerSqft,
      laborPerSqft,
    } as LayoutParams);
  }, [width, length, materialWidth, materialLength, pattern, wasteFactor, pricePerSqft, laborPerSqft]);

  const handlePatternChange = (newPattern: string) => {
    if (isFree && newPattern !== "straight") {
      toast({
        title: "Pro feature",
        description: `${PATTERN_INFO[newPattern as keyof typeof PATTERN_INFO].label} pattern requires a Pro subscription`,
        variant: "destructive",
      });
      return;
    }
    setPattern(newPattern);
  };

  const presets = MATERIAL_PRESETS[materialType as keyof typeof MATERIAL_PRESETS] || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-semibold text-lg border-none px-0 h-auto py-0 focus-visible:ring-0 max-w-xs"
              data-testid={`input-room-name-${room.id}`}
            />
            <Badge variant="secondary" className="capitalize">{materialType}</Badge>
            <Badge variant="outline" className="capitalize">{PATTERN_INFO[pattern as keyof typeof PATTERN_INFO]?.label}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete} data-testid={`button-delete-room-${room.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas - spans 2 columns */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <LayoutCanvas
                result={layoutResult}
                roomWidth={width}
                roomLength={length}
                pattern={pattern}
              />
            </div>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <StatCard icon={Layers} label="Total Pieces" value={layoutResult.totalPlanks.toString()} sub={`${layoutResult.fullPlanks} full, ${layoutResult.cutPlanks} cut`} />
              <StatCard icon={Scissors} label="Material Needed" value={`${layoutResult.materialNeeded} boxes`} sub={`${layoutResult.materialArea.toFixed(0)} sq ft`} />
              <StatCard icon={Ruler} label="Room Area" value={`${layoutResult.roomArea.toFixed(0)} sq ft`} sub={`Waste: ${layoutResult.wastePercentage.toFixed(1)}%`} />
              <StatCard icon={DollarSign} label="Total Cost" value={`$${layoutResult.totalCost.toFixed(0)}`} sub={`$${layoutResult.cost.toFixed(0)} mat + $${layoutResult.laborCost.toFixed(0)} labor`} />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            {/* Room dimensions */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room Dimensions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`width-${room.id}`} className="text-xs">Width (ft)</Label>
                  <Input
                    id={`width-${room.id}`}
                    type="number"
                    step="0.5"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    data-testid={`input-width-${room.id}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`length-${room.id}`} className="text-xs">Length (ft)</Label>
                  <Input
                    id={`length-${room.id}`}
                    type="number"
                    step="0.5"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    data-testid={`input-length-${room.id}`}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Material */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material</Label>
              <Select value={materialType} onValueChange={(v) => {
                setMaterialType(v);
                const preset = MATERIAL_PRESETS[v as keyof typeof MATERIAL_PRESETS]?.[0];
                if (preset) {
                  setMaterialWidth(preset.width);
                  setMaterialLength(preset.length);
                }
              }}>
                <SelectTrigger data-testid={`select-material-type-${room.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plank">Plank / LVP / Laminate</SelectItem>
                  <SelectItem value="tile">Tile</SelectItem>
                  <SelectItem value="carpet">Carpet Roll</SelectItem>
                  <SelectItem value="sheet">Sheet Vinyl</SelectItem>
                </SelectContent>
              </Select>

              {presets.length > 0 && (
                <Select
                  onValueChange={(v) => {
                    const preset = presets.find((p: any) => p.name === v);
                    if (preset) {
                      setMaterialWidth(preset.width);
                      setMaterialLength(preset.length);
                    }
                  }}
                  defaultValue={presets[0]?.name}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Material size preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p: any) => (
                      <SelectItem key={p.name} value={p.name}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Width (in)</Label>
                  <Input type="number" step="0.5" value={materialWidth} onChange={(e) => setMaterialWidth(parseFloat(e.target.value) || 0)} data-testid={`input-mat-width-${room.id}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length (in)</Label>
                  <Input type="number" step="0.5" value={materialLength} onChange={(e) => setMaterialLength(parseFloat(e.target.value) || 0)} data-testid={`input-mat-length-${room.id}`} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pattern */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pattern</Label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(PATTERN_INFO).map(([key, info]) => {
                  const locked = isFree && !info.free;
                  const selected = pattern === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePatternChange(key)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                      data-testid={`button-pattern-${key}-${room.id}`}
                    >
                      <div>
                        <span className="text-sm font-medium">{info.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{info.description}</span>
                      </div>
                      {locked ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" />
                          <span>Pro</span>
                        </div>
                      ) : selected ? (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label className="text-xs">Material $/sqft</Label>
                  <Input type="number" step="0.01" value={pricePerSqft} onChange={(e) => setPricePerSqft(parseFloat(e.target.value) || 0)} className="w-24 h-8 text-sm" data-testid={`input-price-${room.id}`} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Label className="text-xs">Labor $/sqft</Label>
                  <Input type="number" step="0.01" value={laborPerSqft} onChange={(e) => setLaborPerSqft(parseFloat(e.target.value) || 0)} className="w-24 h-8 text-sm" data-testid={`input-labor-${room.id}`} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Waste factor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Waste Factor</Label>
                <span className="text-sm font-semibold">{wasteFactor}%</span>
              </div>
              <Slider value={[wasteFactor]} min={0} max={25} step={1} onValueChange={(v) => setWasteFactor(v[0])} data-testid={`slider-waste-${room.id}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Add Room Dialog ───
function AddRoomDialog({ open, onOpenChange, projectId, isFree, token, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  isFree: boolean;
  token: string | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [width, setWidth] = useState(12);
  const [length, setLength] = useState(12);
  const [materialType, setMaterialType] = useState("plank");
  const [pattern, setPattern] = useState("straight");
  const [materialWidth, setMaterialWidth] = useState(5);
  const [materialLength, setMaterialLength] = useState(48);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Room name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await apiRequest("POST", `/api/projects/${projectId}/rooms`, {
        name, width, length, materialType, pattern, materialWidth, materialLength,
        wasteFactor: 10, pricePerSqft: 4.50, laborPerSqft: 3.50,
      });
      toast({ title: "Room added" });
      onSuccess();
      onOpenChange(false);
      setName("");
      setWidth(12);
      setLength(12);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Living Room" data-testid="input-new-room-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="room-width">Width (ft)</Label>
              <Input id="room-width" type="number" step="0.5" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 0)} data-testid="input-new-room-width" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-length">Length (ft)</Label>
              <Input id="room-length" type="number" step="0.5" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 0)} data-testid="input-new-room-length" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Material Type</Label>
            <Select value={materialType} onValueChange={(v) => {
              setMaterialType(v);
              const preset = MATERIAL_PRESETS[v as keyof typeof MATERIAL_PRESETS]?.[0];
              if (preset) { setMaterialWidth(preset.width); setMaterialLength(preset.length); }
            }}>
              <SelectTrigger data-testid="select-new-material-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plank">Plank / LVP / Laminate</SelectItem>
                <SelectItem value="tile">Tile</SelectItem>
                <SelectItem value="carpet">Carpet Roll</SelectItem>
                <SelectItem value="sheet">Sheet Vinyl</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pattern</Label>
            <Select value={pattern} onValueChange={(v) => {
              if (isFree && v !== "straight") {
                toast({ title: "Pro feature", description: "Upgrade to use this pattern", variant: "destructive" });
                return;
              }
              setPattern(v);
            }}>
              <SelectTrigger data-testid="select-new-pattern"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PATTERN_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key} disabled={isFree && !info.free}>
                    {info.label} {isFree && !info.free ? "(Pro)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating} data-testid="button-create-room">
            {creating ? "Adding..." : "Add Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
