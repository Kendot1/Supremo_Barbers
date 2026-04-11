import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Scissors,
  Clock,
  Image as ImageIcon,
  Power,
  AlertCircle,
  CheckCircle2,
  Upload,
  ArrowUpDown,
  TrendingUp,
  Download,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import { toast } from "sonner";
import { Alert, AlertDescription } from "./ui/alert";
import { Switch } from "./ui/switch";
import API from "../services/api.service";
import { ImageWithFallback } from "./fallback/ImageWithFallback";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";
import type { User } from "../App";
import {
  exportToCSV,
  formatCurrencyForExport,
  formatDateForExport,
} from "./utils/exportUtils";
import { Pagination } from "./ui/pagination";

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServicesModuleProps {
  user: User;
  onBookService?: (serviceId: string) => void;
}

export function ServicesModule({ user, onBookService }: ServicesModuleProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<Service | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>(
    {
    isOpen: false,
    service: null,
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleConfirmation, setToggleConfirmation] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({ isOpen: false, service: null });
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [servicesPerPage, setServicesPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    imageUrl: "",
    isActive: true,
  });

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const data = await API.services.getAll();
      console.log('🔍 ServicesModule - Fetched services:', data);
      console.log('🔍 ServicesModule - First service imageUrl:', data[0]?.imageUrl);
      setServices(data);
    } catch (error) {
      console.error('❌ ServicesModule - Error fetching services:', error);
      // Backend not available - show empty state
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price.toString(),
        duration: service.duration.toString(),
        imageUrl: service.imageUrl || "",
        isActive: service.isActive,
      });
      setImagePreview(service.imageUrl || "");
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        duration: "",
        imageUrl: "",
        isActive: true,
      });
      setImagePreview("");
    }
    setUploadedFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "",
      imageUrl: "",
      isActive: true,
    });
    setImagePreview("");
    setUploadedFile(null);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Upload to Cloudflare R2 immediately
    try {
      setIsSubmitting(true);
      toast.loading("Uploading image to Cloudflare R2...", {
        id: "image-upload",
      });

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await API.uploadImage(uploadFormData);

      // Set the R2 URL in form data
      setFormData({ ...formData, imageUrl: response.url });
      setImagePreview(response.url);
      setUploadedFile(file);

      toast.success(
        "Image uploaded to Cloudflare R2 successfully!",
        { id: "image-upload" },
      );
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image to Cloudflare R2", {
        id: "image-upload",
      });

      // Clear the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setFormData({ ...formData, imageUrl: "" });
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Service description is required");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return false;
    }
    if (
      !formData.duration ||
      parseInt(formData.duration) <= 0
    ) {
      toast.error("Please enter a valid duration");
      return false;
    }
    return true;
  };

  const handleSaveService = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      // Image URL is already set if user uploaded via the upload input
      // No need to re-upload here
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        imageUrl: formData.imageUrl || undefined,
        isActive: formData.isActive,
      };

      if (editingService) {
        // Update existing service
        await API.services.update(
          editingService.id,
          serviceData,
        );
        toast.success("Service updated successfully!");
      } else {
        // Create new service
        await API.services.create(serviceData);
        toast.success("Service created successfully!");
      }

      // Refetch services from database to ensure UI is in sync
      await fetchServices();
      handleCloseDialog();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BACKEND_UNAVAILABLE"
      ) {
        toast.error(
          "Backend server is not running. Please start the server to manage services.",
        );
      } else {
        toast.error(
          editingService
            ? "Failed to update service"
            : "Failed to create service",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (password: string) => {
    if (!deleteConfirmation.service) return;

    try {
      // Verify password first
      const isValid = await API.auth.verifyPassword(
        user.id,
        password,
      );
      if (!isValid) {
        toast.error("Invalid password");
        return;
      }

      await API.services.delete(deleteConfirmation.service.id);
      toast.success("Service deleted successfully!");
      setDeleteConfirmation({ isOpen: false, service: null });

      // Refetch services from database to ensure UI is in sync
      await fetchServices();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BACKEND_UNAVAILABLE"
      ) {
        toast.error(
          "Backend server is not running. Please start the server to delete services.",
        );
      } else {
        toast.error("Failed to delete service");
      }
    }
  };

  const handleToggleStatus = async (service: Service) => {
    setTogglingServiceId(service.id);
    console.log("🔄 Toggling service status:", {
      serviceId: service.id,
      serviceName: service.name,
      currentStatus: service.isActive,
      newStatus: !service.isActive,
    });

    try {
      const updateData = {
        isActive: !service.isActive,
      };
      console.log("📤 Sending update request:", updateData);

      const result = await API.services.update(
        service.id,
        updateData,
      );
      console.log("✅ Update successful:", result);

      toast.success(
        `Service ${!service.isActive ? "activated" : "deactivated"} successfully!`,
      );

      // Refetch services from database to ensure UI is in sync
      await fetchServices();
    } catch (error) {
      console.error("❌ Toggle status error:", error);
      console.error("Error details:", {
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        error,
      });

      if (
        error instanceof Error &&
        error.message === "BACKEND_UNAVAILABLE"
      ) {
        toast.error(
          "Backend server is not running. Please start the server to update services.",
        );
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error occurred";
        toast.error(
          `Failed to update service status: ${errorMessage}`,
        );
      }
    } finally {
      setTogglingServiceId(null);
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      service.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // Sort filtered services
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "duration-asc":
        return a.duration - b.duration;
      case "duration-desc":
        return b.duration - a.duration;
      case "status-active":
        return b.isActive === a.isActive
          ? 0
          : b.isActive
            ? 1
            : -1;
      case "status-inactive":
        return a.isActive === b.isActive
          ? 0
          : a.isActive
            ? 1
            : -1;
      default:
        return 0;
    }
  });

  const activeServices = services.filter(
    (s) => s.isActive,
  ).length;
  const totalRevenuePotential = services
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.price, 0);
  const averageDuration =
    services.length > 0
      ? Math.round(
          services.reduce((sum, s) => sum + s.duration, 0) /
            services.length,
        )
      : 0;

  const handleExportServices = () => {
    if (sortedServices.length === 0) {
      toast.error("No services to export");
      return;
    }

    const exportData = sortedServices.map((service) => ({
      Name: service.name,
      Description: service.description,
      Price: formatCurrencyForExport(service.price),
      "Duration (minutes)": service.duration,
      Status: service.isActive ? "Active" : "Inactive",
      "Created At": formatDateForExport(service.createdAt),
      "Updated At": formatDateForExport(service.updatedAt),
    }));

    exportToCSV(
      exportData,
      [
        "Name",
        "Description",
        "Price",
        "Duration (minutes)",
        "Status",
        "Created At",
        "Updated At",
      ],
      "supremo-barber-services"
    );

    toast.success(
      `Exported ${sortedServices.length} services successfully!`
    );
  };

  // Calculate pagination
  const indexOfLastService = currentPage * servicesPerPage;
  const indexOfFirstService = indexOfLastService - servicesPerPage;
  const currentServices = sortedServices.slice(indexOfFirstService, indexOfLastService);
  const totalPages = Math.ceil(sortedServices.length / servicesPerPage);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DB9D47] p-2 sm:p-2.5 rounded-lg">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
            {services.length}
          </p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">
            Total Services
          </p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#94A670] p-2 sm:p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
            {activeServices}
          </p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">
            Active Services
          </p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#D98555] p-2 sm:p-2.5 rounded-lg">
              <FaPesoSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
            ₱{totalRevenuePotential}
          </p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">
            Revenue Potential
          </p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#B89968] p-2 sm:p-2.5 rounded-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
            {averageDuration}m
          </p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">
            Avg Duration
          </p>
        </div>
      </div>

      {/* Services Management */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A]">
                Service Management
              </CardTitle>
              <CardDescription className="text-[#87765E]">
                Manage your barbershop services, pricing, and
                duration
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={handleExportServices}
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Sort Bar */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DCC8]"
              />
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E] pointer-events-none z-10" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="pl-10 border-[#E8DCC8]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">
                    Name (A-Z)
                  </SelectItem>
                  <SelectItem value="name-desc">
                    Name (Z-A)
                  </SelectItem>
                  <SelectItem value="price-asc">
                    Price (Low to High)
                  </SelectItem>
                  <SelectItem value="price-desc">
                    Price (High to Low)
                  </SelectItem>
                  <SelectItem value="duration-asc">
                    Duration (Short to Long)
                  </SelectItem>
                  <SelectItem value="duration-desc">
                    Duration (Long to Short)
                  </SelectItem>
                  <SelectItem value="status-active">
                    Status (Active First)
                  </SelectItem>
                  <SelectItem value="status-inactive">
                    Status (Inactive First)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Backend Status Alert */}
          {services.length === 0 && !isLoading && (
            <Alert className="mb-6 border-[#DB9D47] bg-orange-50">
              <AlertCircle className="w-4 h-4 text-[#DB9D47]" />
              <AlertDescription className="text-sm text-[#5C4A3A]">
                <strong>Backend not connected:</strong> To
                manage services, please start the backend server
                using{" "}
                <code className="bg-[#E8DCC8] px-1.5 py-0.5 rounded text-xs">
                  cd backend && npm run dev
                </code>
              </AlertDescription>
            </Alert>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border border-[#E8DCC8] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A]">
                    Service
                  </TableHead>
                  <TableHead className="text-[#5C4A3A]">
                    Description
                  </TableHead>
                  <TableHead className="text-[#5C4A3A] text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-[#5C4A3A] text-right">
                    Duration
                  </TableHead>
                  <TableHead className="text-[#5C4A3A] text-center">
                    Status
                  </TableHead>
                  
                  <TableHead className="text-[#5C4A3A] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={onBookService ? 7 : 6}
                      className="text-center py-8 text-[#87765E]"
                    >
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : sortedServices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={onBookService ? 7 : 6}
                      className="text-center py-8 text-[#87765E]"
                    >
                      {searchQuery
                        ? "No services found matching your search"
                        : "No services available. Click 'Add Service' to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentServices.map((service) => (
                    <TableRow
                      key={service.id}
                      className="hover:bg-[#FBF7EF]"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#E8DCC8] flex items-center justify-center overflow-hidden">
                            {service.imageUrl ? (
                              <ImageWithFallback
                                src={service.imageUrl}
                                alt={service.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Scissors className="w-5 h-5 text-[#87765E]" />
                            )}
                          </div>
                          <span className="text-[#5C4A3A]">
                            {service.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#87765E] max-w-xs truncate">
                        {service.description}
                      </TableCell>
                      <TableCell className="text-right text-[#DB9D47]">
                        ₱{service.price}
                      </TableCell>
                      <TableCell className="text-right text-[#87765E]">
                        {service.duration} min
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={() =>
                              handleToggleStatus(service)
                            }
                            disabled={
                              togglingServiceId === service.id
                            }
                            className="data-[state=checked]:bg-[#94A670]"
                          />
                          <Badge
                            variant="outline"
                            className={
                              service.isActive
                                ? "border-[#94A670] text-[#94A670]"
                                : "border-[#87765E] text-[#87765E]"
                            }
                          >
                            {togglingServiceId === service.id
                              ? "Updating..."
                              : service.isActive
                                ? "Active"
                                : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleOpenDialog(service)
                            }
                            className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-orange-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteConfirmation({
                                isOpen: true,
                                service,
                              })
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-[#87765E]">
                Loading services...
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="text-center py-8 text-[#87765E]">
                {searchQuery
                  ? "No services found matching your search"
                  : "No services available. Click 'Add Service' to get started."}
              </div>
            ) : (
              currentServices.map((service) => (
                <Card
                  key={service.id}
                  className="border-[#E8DCC8]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 rounded-lg bg-[#E8DCC8] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {service.imageUrl ? (
                          <ImageWithFallback
                            src={service.imageUrl}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Scissors className="w-6 h-6 text-[#87765E]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[#5C4A3A] mb-1 truncate">
                          {service.name}
                        </h3>
                        <p className="text-sm text-[#87765E] line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <FaPesoSign className="w-4 h-4 text-[#DB9D47]" />
                        <span className="text-[#DB9D47]">
                          ₱{service.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#87765E]" />
                        <span className="text-[#87765E]">
                          {service.duration} min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E8DCC8]">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.isActive}
                          onCheckedChange={() =>
                            handleToggleStatus(service)
                          }
                          disabled={
                            togglingServiceId === service.id
                          }
                          className="data-[state=checked]:bg-[#94A670]"
                        />
                        <Badge
                          variant="outline"
                          className={
                            service.isActive
                              ? "border-[#94A670] text-[#94A670]"
                              : "border-[#87765E] text-[#87765E]"
                          }
                        >
                          {togglingServiceId === service.id
                            ? "Updating..."
                            : service.isActive
                              ? "Active"
                              : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {onBookService && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onBookService(service.id);
                            toast.success("Service selected! Complete your booking.");
                          }}
                          disabled={!service.isActive}
                          className="w-full bg-[#DB9D47] text-white hover:bg-[#C88A35] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Book Now
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenDialog(service)
                          }
                          className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDeleteConfirmation({
                              isOpen: true,
                              service,
                            })
                          }
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {!isLoading && sortedServices.length > 0 && (
            <div className="mt-6">
              <Pagination
                totalItems={sortedServices.length}
                itemsPerPage={servicesPerPage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setServicesPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Service Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">
              {editingService
                ? "Edit Service"
                : "Add New Service"}
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              {editingService
                ? "Update service details below"
                : "Fill in the details to create a new service"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Service Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#5C4A3A]">
                Service Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Premium Haircut"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                className="border-[#E8DCC8]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="description"
                className="text-[#5C4A3A]"
              >
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the service in detail..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="border-[#E8DCC8] w-full h-[100px] resize-none overflow-y-auto whitespace-normal break-all [field-sizing:initial]"
                style={{
                  overflowX: "hidden",
                  wordBreak: "break-all",
                  overflowWrap: "anywhere",
                }}
              />
            </div>

            {/* Price and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="price"
                  className="text-[#5C4A3A]"
                >
                  Price (₱) *
                </Label>
                <div className="relative">
                  <p className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]">
                    ₱
                  </p>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value,
                      })
                    }
                    className="pl-10 border-[#E8DCC8]"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="duration"
                  className="text-[#5C4A3A]"
                >
                  Duration (minutes) *
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: e.target.value,
                      })
                    }
                    className="pl-10 border-[#E8DCC8]"
                    min="1"
                    step="5"
                  />
                </div>
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label
                htmlFor="imageUrl"
                className="text-[#5C4A3A]"
              >
                Image URL (optional)
              </Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      imageUrl: e.target.value,
                    })
                  }
                  className="pl-10 border-[#E8DCC8]"
                />
              </div>
              <p className="text-xs text-[#87765E]">
                Enter a URL to an image hosted online (PNG, JPG,
                or JPEG)
              </p>
              {formData.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border-2 border-[#E8DCC8] bg-[#FBF7EF]">
                  <ImageWithFallback
                    src={formData.imageUrl}
                    alt="Service image preview"
                    className="w-full h-auto max-h-[200px] object-contain"
                  />
                </div>
              )}
            </div>

            {/* Upload Image */}
            <div className="space-y-1.5">
              <Label
                htmlFor="imageUpload"
                className="text-[#5C4A3A]\"
              >
                Upload Image (optional)
              </Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="pl-10 border-[#E8DCC8]"
                  ref={fileInputRef}
                />
              </div>
              <p className="text-xs text-[#87765E]">
                Upload an image file (PNG, JPG, WEBP, or GIF -
                Max 5MB). Images will be stored on Cloudflare
                R2.
              </p>
              {imagePreview && (
                <div className="mt-2 rounded-lg overflow-hidden border-2 border-[#E8DCC8] bg-[#FBF7EF] relative">
                  <ImageWithFallback
                    src={imagePreview}
                    alt="Service image preview"
                    className="w-full h-auto max-h-[200px] object-contain"
                  />
                  {(uploadedFile || imagePreview) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-[#E8DCC8] bg-[#FBF7EF]">
              <div className="space-y-0.5">
                <Label className="text-[#5C4A3A]">
                  Active Status
                </Label>
                <p className="text-xs text-[#87765E]">
                  Make this service available for booking
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isActive: checked,
                  })
                }
                className="data-[state=checked]:bg-[#94A670]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="border-[#E8DCC8] text-[#5C4A3A]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveService}
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              disabled={isSubmitting}
            >
              {editingService
                ? "Update Service"
                : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({
            isOpen: false,
            service: null,
          })
        }
        onConfirm={handleDeleteService}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteConfirmation.service?.name}"? This action cannot be undone.`}
        user={user}
      />
    </div>
  );
}