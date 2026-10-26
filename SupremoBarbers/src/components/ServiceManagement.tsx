import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { Plus, Edit, Trash2, Scissors, Clock, Search, Filter, Loader2, Upload, X, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordConfirmationDialog } from './PasswordConfirmationDialog';
import API from '../services/api.service';
import { exportToCSV } from './utils/exportUtils';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  imageUrl?: string;
  isActive?: boolean;
}

export function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrice, setFilterPrice] = useState('all');
  const [newService, setNewService] = useState<Omit<Service, 'id'>>({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    category: 'Haircut',
    imageUrl: '',
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [editUploadedFile, setEditUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'delete' | 'edit' | null;
    serviceId: string | null;
    serviceName: string | null;
  }>({
    isOpen: false,
    action: null,
    serviceId: null,
    serviceName: null,
  });

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Store file and create preview
    if (isEdit) {
      setEditUploadedFile(file);
    } else {
      setUploadedFile(file);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      if (isEdit) {
        setEditImagePreview(previewUrl);
      } else {
        setImagePreview(previewUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (isEdit: boolean = false) => {
    if (isEdit && editingService) {
      setEditImagePreview('');
      setEditingService({ ...editingService, imageUrl: '' });
      setEditUploadedFile(null);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    } else {
      setImagePreview('');
      setNewService({ ...newService, imageUrl: '' });
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const fetchedServices = await API.services.getAll();
      setServices(fetchedServices);
    } catch (error) {
      // Backend not available - show empty state
      if (error instanceof Error && error.message === 'BACKEND_UNAVAILABLE') {
        setServices([]);
        return;
      }
      console.error('Error fetching services:', error);
      toast.error('Failed to load services. Please ensure the backend is running.');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.price.toString().includes(searchTerm) ||
      service.duration.toString().includes(searchTerm);

    let matchesPrice = true;
    if (filterPrice === 'low') matchesPrice = service.price < 300;
    else if (filterPrice === 'medium') matchesPrice = service.price >= 300 && service.price < 500;
    else if (filterPrice === 'high') matchesPrice = service.price >= 500;

    return matchesSearch && matchesPrice;
  });

  const handleAddService = async () => {
    if (!newService.name || !newService.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);
      let imageUrl = newService.imageUrl;

      // If user uploaded a new file, upload it to Cloudflare R2
      if (uploadedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', uploadedFile);

        const response = await API.uploadImage(uploadFormData);
        imageUrl = response.url;
        toast.success('Image uploaded successfully');
      }

      const serviceData = {
        ...newService,
        imageUrl: imageUrl || undefined,
      };

      const createdService = await API.services.create(serviceData);
      setServices([...services, createdService]);
      setIsAddDialogOpen(false);
      setNewService({
        name: '',
        description: '',
        price: 0,
        duration: 30,
        category: 'Haircut',
        imageUrl: '',
        isActive: true,
      });
      setImagePreview('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Service added successfully');
    } catch (error) {
      // Handle backend unavailable - fall back to demo mode
      if (error instanceof Error && error.message === 'BACKEND_UNAVAILABLE') {
        const service: Service = {
          id: Date.now().toString(),
          ...newService,
        };
        setServices([...services, service]);
        setIsAddDialogOpen(false);
        setNewService({
          name: '',
          description: '',
          price: 0,
          duration: 30,
          category: 'Haircut',
          imageUrl: '',
          isActive: true,
        });
        setImagePreview('');
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        toast.success('Service added (Demo Mode - Backend not connected)');
        return;
      }
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (service: Service) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'edit',
      serviceId: service.id,
      serviceName: service.name,
    });
  };

  const confirmEditService = () => {
    if (passwordConfirmation.serviceId) {
      const service = services.find(s => s.id === passwordConfirmation.serviceId);
      if (service) {
        setEditingService(service);
        setEditImagePreview(service.imageUrl || '');
        setIsEditDialogOpen(true);
      }
    }
  };

  const handleEditService = async () => {
    if (!editingService) return;

    try {
      setIsUploading(true);
      let imageUrl = editingService.imageUrl;

      // If user uploaded a new file, upload it to Cloudflare R2
      if (editUploadedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', editUploadedFile);

        const response = await API.uploadImage(uploadFormData);
        imageUrl = response.url;
        toast.success('Image uploaded successfully');
      }

      const updatedServiceData = {
        ...editingService,
        imageUrl: imageUrl || undefined,
      };

      const updatedService = await API.services.update(editingService.id, updatedServiceData);
      setServices(services.map(s => s.id === editingService.id ? updatedService : s));
      setIsEditDialogOpen(false);
      setEditingService(null);
      setEditImagePreview('');
      setEditUploadedFile(null);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
      toast.success('Service updated successfully');
    } catch (error) {
      // Handle backend unavailable - fall back to demo mode
      if (error instanceof Error && error.message === 'BACKEND_UNAVAILABLE') {
        setServices(services.map(s => s.id === editingService.id ? editingService : s));
        setIsEditDialogOpen(false);
        setEditingService(null);
        setEditImagePreview('');
        setEditUploadedFile(null);
        if (editFileInputRef.current) {
          editFileInputRef.current.value = '';
        }
        toast.success('Service updated (Demo Mode - Backend not connected)');
        return;
      }
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'delete',
      serviceId,
      serviceName,
    });
  };

  const confirmDeleteService = async () => {
    if (!passwordConfirmation.serviceId) return;

    try {
      await API.services.delete(passwordConfirmation.serviceId);
      setServices(services.filter(s => s.id !== passwordConfirmation.serviceId));
      toast.success('Service deleted successfully');
    } catch (error) {
      // Handle backend unavailable - fall back to demo mode
      if (error instanceof Error && error.message === 'BACKEND_UNAVAILABLE') {
        setServices(services.filter(s => s.id !== passwordConfirmation.serviceId));
        toast.success('Service deleted (Demo Mode - Backend not connected)');
        return;
      }
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleExportCSV = () => {
    if (filteredServices.length === 0) {
      toast.error('No services to export');
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredServices.map(service => ({
        'Service ID': service.id,
        'Service Name': service.name,
        'Description': service.description,
        'Category': service.category,
        'Price (₱)': service.price.toFixed(2),
        'Duration (minutes)': service.duration,
        'Status': service.isActive ? 'Active' : 'Inactive',
      }));

      const headers = ['Service ID', 'Service Name', 'Description', 'Category', 'Price (₱)', 'Duration (minutes)', 'Status'];

      exportToCSV(exportData, headers, 'supremo-barber-services');
      toast.success(`Exported ${filteredServices.length} service(s) to CSV`);
    } catch (error) {
      console.error('Error exporting services:', error);
      toast.error('Failed to export services');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Management</CardTitle>
          <CardDescription>Loading services...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Management</CardTitle>
            <CardDescription>Add, edit, or remove barber services</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                  <DialogDescription>Create a new service offering</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Service Name *</Label>
                    <Input
                      id="name"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="e.g., Premium Haircut"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="Brief description of the service"
                      className="w-full h-[150px] resize-none overflow-y-auto whitespace-normal break-all [field-sizing:initial]"
                      style={{ overflowX: 'hidden', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={newService.category}
                      onValueChange={(value) => setNewService({ ...newService, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Haircut">Haircut</SelectItem>
                        <SelectItem value="Shave">Shave</SelectItem>
                        <SelectItem value="Styling">Styling</SelectItem>
                        <SelectItem value="Coloring">Coloring</SelectItem>
                        <SelectItem value="Treatment">Treatment</SelectItem>
                        <SelectItem value="Grooming">Grooming</SelectItem>
                        <SelectItem value="Package">Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C4A3A]">Service Image (optional)</Label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                    />

                    {!imagePreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
                      >
                        <Upload className="w-12 h-12 text-[#87765E] mb-3" />
                        <p className="text-[#5C4A3A] mb-1">Click to upload service image</p>
                        <p className="text-xs text-[#87765E]">PNG, JPG or JPEG (max. 5MB)</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden border-2 border-[#E8DCC8] bg-[#FBF7EF]">
                          <img
                            src={imagePreview}
                            alt="Service image preview"
                            className="w-full h-auto max-h-[300px] object-contain"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                          >
                            Change Image
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeImage(false)}
                            className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (₱) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (min) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newService.duration}
                        onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddService}>Add Service</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterPrice} onValueChange={setFilterPrice}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="low">Low (₱0-300)</SelectItem>
              <SelectItem value="medium">Medium (₱300-500)</SelectItem>
              <SelectItem value="high">High (₱500+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No services found
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      {service.imageUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border">
                          <img
                            src={service.imageUrl}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-slate-400" />
                        {service.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-slate-600">
                      {service.description}
                    </TableCell>
                    <TableCell className="text-sm">
                      {service.category}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {service.duration} min
                      </div>
                    </TableCell>
                    <TableCell>₱{service.price}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service.id, service.name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        {editingService && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Service</DialogTitle>
                <DialogDescription>Update service details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Service Name</Label>
                  <Input
                    id="edit-name"
                    value={editingService.name}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingService.description}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="w-full h-[150px] resize-none overflow-y-auto whitespace-normal break-all [field-sizing:initial]"
                    style={{ overflowX: 'hidden', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editingService.category}
                    onValueChange={(value) => setEditingService({ ...editingService, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Haircut">Haircut</SelectItem>
                      <SelectItem value="Shave">Shave</SelectItem>
                      <SelectItem value="Styling">Styling</SelectItem>
                      <SelectItem value="Coloring">Coloring</SelectItem>
                      <SelectItem value="Treatment">Treatment</SelectItem>
                      <SelectItem value="Grooming">Grooming</SelectItem>
                      <SelectItem value="Package">Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#5C4A3A]">Service Image (optional)</Label>

                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                  />

                  {!editImagePreview ? (
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
                    >
                      <Upload className="w-12 h-12 text-[#87765E] mb-3" />
                      <p className="text-[#5C4A3A] mb-1">Click to upload service image</p>
                      <p className="text-xs text-[#87765E]">PNG, JPG or JPEG (max. 5MB)</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border-2 border-[#E8DCC8] bg-[#FBF7EF]">
                        <img
                          src={editImagePreview}
                          alt="Service image preview"
                          className="w-full h-auto max-h-[300px] object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => editFileInputRef.current?.click()}
                          className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                        >
                          Change Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeImage(true)}
                          className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price (₱)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editingService.price}
                      onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duration (min)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      value={editingService.duration}
                      onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleEditService}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={passwordConfirmation.isOpen}
        onClose={() =>
          setPasswordConfirmation({ isOpen: false, action: null, serviceId: null, serviceName: null })
        }
        onConfirm={() => {
          if (passwordConfirmation.action === 'delete') {
            confirmDeleteService();
          } else if (passwordConfirmation.action === 'edit') {
            confirmEditService();
          }
        }}
        title={
          passwordConfirmation.action === 'delete'
            ? 'Confirm Service Deletion'
            : 'Confirm Service Edit'
        }
        description={
          passwordConfirmation.action === 'delete'
            ? `Enter your password to confirm deletion of "${passwordConfirmation.serviceName}"`
            : `Enter your password to edit "${passwordConfirmation.serviceName}"`
        }
        actionType={passwordConfirmation.action || 'action'}
      />
    </Card>
  );
}
