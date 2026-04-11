import { useState, useMemo, useEffect } from 'react';
import API from '../services/api.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from './ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './ui/dialog';
import { 
  Search, Star, Filter, Eye, EyeOff, Trash2, Download, TrendingUp 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PasswordConfirmationDialog } from './PasswordConfirmationDialog';
import { Pagination } from './ui/pagination';

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  service: string;
  barber: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean; // For showcasing on landing page
}

interface ReviewsManagementProps {
  reviews?: Review[];
  onUpdateReviews?: (reviews: Review[]) => void;
}

// Mock data for demonstration
const mockReviews: Review[] = [
  {
    id: 'rev-1',
    customerId: 'cust-1',
    customerName: 'Mike Rodriguez',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Excellent service! Tony gave me the best haircut I\'ve ever had. The attention to detail is amazing and the atmosphere is very professional.',
    service: 'Supremo Espesyal',
    barber: 'Tony Stark',
    date: '2025-10-20',
    status: 'approved',
    featured: true,
  },
  {
    id: 'rev-2',
    customerId: 'cust-2',
    customerName: 'Sarah Johnson',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Amazing experience! Very clean and professional environment. Peter is incredibly skilled and friendly.',
    service: 'Gupit Supremo w/ Banlaw',
    barber: 'Peter Parker',
    date: '2025-10-19',
    status: 'approved',
    featured: true,
  },
  {
    id: 'rev-3',
    customerId: 'cust-3',
    customerName: 'David Chen',
    rating: 4,
    comment: 'Great haircut and good price. The only thing is the wait time was a bit long, but worth it.',
    service: 'Gupit Supremo',
    barber: 'Bruce Wayne',
    date: '2025-10-18',
    status: 'approved',
    featured: false,
  },
  {
    id: 'rev-4',
    customerId: 'cust-4',
    customerName: 'Emma Wilson',
    customerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Best barbershop in town! The scalp treatment was so relaxing and my hair feels amazing.',
    service: 'Scalp Treatment',
    barber: 'Tony Stark',
    date: '2025-10-17',
    status: 'approved',
    featured: true,
  },
  {
    id: 'rev-5',
    customerId: 'cust-5',
    customerName: 'James Martinez',
    rating: 3,
    comment: 'Service was okay. The haircut was fine but not exactly what I asked for.',
    service: 'Gupit Supremo',
    barber: 'Peter Parker',
    date: '2025-10-16',
    status: 'approved',
    featured: false,
  },
  {
    id: 'rev-6',
    customerId: 'cust-6',
    customerName: 'Lisa Anderson',
    rating: 5,
    comment: 'Outstanding! The hair tattoo design was exactly what I wanted. Highly recommend!',
    service: 'Hair Tattoo',
    barber: 'Bruce Wayne',
    date: '2025-10-15',
    status: 'pending',
    featured: false,
  },
];

export function ReviewsManagement({ 
  reviews: propReviews, 
  onUpdateReviews 
}: ReviewsManagementProps) {
  const [reviews, setReviews] = useState<Review[]>(propReviews || mockReviews);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewsPerPage, setReviewsPerPage] = useState(10);
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'delete' | 'approve' | 'reject' | null;
    reviewId: string | null;
    customerName: string | null;
  }>({
    isOpen: false,
    action: null,
    reviewId: null,
    customerName: null,
  });

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const fetchedReviews = await API.reviews.getAll();
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews(propReviews || mockReviews);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [propReviews]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter(r => r.status === 'approved').length;
    const featured = reviews.filter(r => r.featured).length;
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';
    
    return { total, approved, featured, avgRating };
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      // Format date for better search experience (supports both YYYY-MM-DD and formatted dates)
      const formattedDate = parseLocalDate(review.date).toLocaleDateString();
      
      const matchesSearch = 
        review.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.barber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.date.includes(searchTerm) ||
        formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.rating.toString().includes(searchTerm) ||
        review.status.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRating = filterRating === 'all' || 
                           (filterRating === '5' && review.rating === 5) ||
                           (filterRating === '4+' && review.rating >= 4) ||
                           (filterRating === '3-' && review.rating <= 3);
      
      const matchesStatus = filterStatus === 'all' || review.status === filterStatus;
      
      return matchesSearch && matchesRating && matchesStatus;
    });
  }, [reviews, searchTerm, filterRating, filterStatus]);

  const handleToggleFeatured = async (reviewId: string) => {
    try {
      await API.reviews.toggleShowOnLanding(reviewId);
      const fetchedReviews = await API.reviews.getAll();
      setReviews(fetchedReviews);
      onUpdateReviews?.(fetchedReviews);
      
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        toast.success(review.featured ? 'Review removed from featured' : 'Review added to featured');
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update review');
    }
  };

  const handleApproveReview = (reviewId: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'approve',
      reviewId,
      customerName,
    });
  };

  const confirmApproveReview = async () => {
    if (passwordConfirmation.reviewId) {
      try {
        await API.reviews.update(passwordConfirmation.reviewId, { status: 'approved' });
        const fetchedReviews = await API.reviews.getAll();
        setReviews(fetchedReviews);
        onUpdateReviews?.(fetchedReviews);
        toast.success('Review approved in database');
      } catch (error) {
        console.error('Error approving review:', error);
        toast.error('Failed to approve review');
      }
    }
  };

  const handleRejectReview = (reviewId: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'reject',
      reviewId,
      customerName,
    });
  };

  const confirmRejectReview = async () => {
    if (passwordConfirmation.reviewId) {
      try {
        await API.reviews.update(passwordConfirmation.reviewId, { status: 'rejected' });
        const fetchedReviews = await API.reviews.getAll();
        setReviews(fetchedReviews);
        onUpdateReviews?.(fetchedReviews);
        toast.success('Review rejected in database');
      } catch (error) {
        console.error('Error rejecting review:', error);
        toast.error('Failed to reject review');
      }
    }
  };

  const handleDeleteReview = (reviewId: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'delete',
      reviewId,
      customerName,
    });
  };

  const confirmDeleteReview = async () => {
    if (passwordConfirmation.reviewId) {
      try {
        await API.reviews.delete(passwordConfirmation.reviewId);
        const fetchedReviews = await API.reviews.getAll();
        setReviews(fetchedReviews);
        onUpdateReviews?.(fetchedReviews);
        toast.success('Review deleted from database');
      } catch (error) {
        console.error('Error deleting review:', error);
        toast.error('Failed to delete review');
      }
    }
  };

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setIsViewDialogOpen(true);
  };

  const handleExportReviews = () => {
    toast.info('Exporting reviews to CSV...');
    // In a real implementation, this would generate and download a CSV file
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-[#DB9D47] text-[#DB9D47]'
                : 'text-[#E8DCC8]'
            }`}
          />
        ))}
      </div>
    );
  };

  // Get current reviews to display
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-[#DB9D47]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">{stats.total}</div>
            <p className="text-xs md:text-sm text-[#87765E]">Reviews</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#94A670]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">{stats.avgRating}</div>
            <p className="text-xs md:text-sm text-[#87765E]">Avg Rating</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-[#D98555]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">{stats.featured}</div>
            <p className="text-xs md:text-sm text-[#87765E]">Featured</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-[#87765E]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">{stats.approved}</div>
            <p className="text-xs md:text-sm text-[#87765E]">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Management */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A] text-base md:text-lg">Customer Reviews</CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Manage and showcase customer feedback
              </CardDescription>
            </div>
            <Button 
              onClick={handleExportReviews}
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-3 md:px-4"
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E8DCC8] text-sm"
              />
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-[180px] border-[#E8DCC8] text-sm">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars Only</SelectItem>
                <SelectItem value="4+">4+ Stars</SelectItem>
                <SelectItem value="3-">3 Stars & Below</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px] border-[#E8DCC8] text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews Table */}
          <div className="rounded-md border border-[#E8DCC8] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm">Customer</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm">Rating</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden lg:table-cell">Service</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden md:table-cell">Barber</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden xl:table-cell">Featured</TableHead>
                  <TableHead className="text-[#5C4A3A] text-xs md:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[#87765E]">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentReviews.map((review) => (
                    <TableRow key={review.id} className="hover:bg-[#FBF7EF]">
                      <TableCell>
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="w-7 h-7 md:w-8 md:h-8">
                            <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                            <AvatarFallback className="bg-[#DB9D47] text-white text-xs">
                              {review.customerName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[#5C4A3A] text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{review.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 md:w-4 md:h-4 ${
                                star <= review.rating
                                  ? 'fill-[#DB9D47] text-[#DB9D47]'
                                  : 'text-[#E8DCC8]'
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#5C4A3A] text-xs hidden lg:table-cell">{review.service}</TableCell>
                      <TableCell className="text-[#87765E] text-xs hidden md:table-cell">{review.barber}</TableCell>
                      <TableCell className="text-[#87765E] text-xs hidden sm:table-cell whitespace-nowrap">
                        {parseLocalDate(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`text-[10px] md:text-xs ${
                            review.status === 'approved' 
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : review.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          {review.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleFeatured(review.id)}
                          disabled={review.status !== 'approved'}
                          className={`h-8 w-8 p-0 ${review.featured ? 'text-[#DB9D47]' : 'text-[#87765E]'}`}
                        >
                          {review.featured ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReview(review)}
                            className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white h-7 md:h-8 px-2 md:px-3 text-xs"
                          >
                            View
                          </Button>
                          {review.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveReview(review.id, review.customerName)}
                                className="border-[#94A670] text-[#94A670] hover:bg-[#94A670] hover:text-white h-7 md:h-8 px-2 md:px-3 text-xs hidden md:inline-flex"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectReview(review.id, review.customerName)}
                                className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white h-7 md:h-8 px-2 md:px-3 text-xs hidden md:inline-flex"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteReview(review.id, review.customerName)}
                            className="text-[#E57373] hover:bg-[#E57373] hover:text-white h-7 md:h-8 w-7 md:w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            totalItems={filteredReviews.length}
            itemsPerPage={reviewsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setReviewsPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* View Review Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Full review information and comments
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedReview.customerAvatar} alt={selectedReview.customerName} />
                  <AvatarFallback className="bg-[#DB9D47] text-white">
                    {selectedReview.customerName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-[#5C4A3A]">{selectedReview.customerName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(selectedReview.rating)}
                    <span className="text-sm text-[#87765E]">
                      {parseLocalDate(selectedReview.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <p className="text-[#5C4A3A]">{selectedReview.comment}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#87765E] mb-1">Service</p>
                  <p className="text-[#5C4A3A]">{selectedReview.service}</p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E] mb-1">Barber</p>
                  <p className="text-[#5C4A3A]">{selectedReview.barber}</p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E] mb-1">Status</p>
                  <Badge 
                    variant="outline"
                    className={
                      selectedReview.status === 'approved' 
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : selectedReview.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }
                  >
                    {selectedReview.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-[#87765E] mb-1">Featured</p>
                  <p className="text-[#5C4A3A]">{selectedReview.featured ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={passwordConfirmation.isOpen}
        onClose={() =>
          setPasswordConfirmation({ isOpen: false, action: null, reviewId: null, customerName: null })
        }
        onConfirm={() => {
          if (passwordConfirmation.action === 'delete') {
            confirmDeleteReview();
          } else if (passwordConfirmation.action === 'approve') {
            confirmApproveReview();
          } else if (passwordConfirmation.action === 'reject') {
            confirmRejectReview();
          }
        }}
        title={
          passwordConfirmation.action === 'delete'
            ? 'Confirm Review Deletion'
            : passwordConfirmation.action === 'approve'
            ? 'Confirm Review Approval'
            : 'Confirm Review Rejection'
        }
        description={
          passwordConfirmation.action === 'delete'
            ? `Enter your password to confirm deletion of review by ${passwordConfirmation.customerName}`
            : passwordConfirmation.action === 'approve'
            ? `Enter your password to approve review by ${passwordConfirmation.customerName}`
            : `Enter your password to reject review by ${passwordConfirmation.customerName}`
        }
        actionType={passwordConfirmation.action === 'delete' ? 'delete' : 'edit'}
      />
    </div>
  );
}