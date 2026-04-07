import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  SparklesIcon,
  Bars3Icon,
  XMarkIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// New Complaint Form Component
function NewComplaintForm({ user }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_completion_time: ''
  });
  const [files, setFiles] = useState([]);
  const [classification, setClassification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const classifyComplaint = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please enter both title and description for classification');
      return;
    }

    setIsClassifying(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ml/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `${formData.title} ${formData.description}`,
          title: formData.title,
          description: formData.description
        })
      });

             const data = await response.json();
       console.log('Classification API response:', data);

       if (data.success) {
         // Transform the API response to match expected format
         const classificationData = {
           category: data.data.predicted_category,
           priority: data.data.predicted_priority,
           method: data.data.classification_method
         };
         console.log('Transformed classification data:', classificationData);
         setClassification(classificationData);
       } else {
         setError(data.message || 'Classification failed');
       }
    } catch (error) {
      setError('Failed to classify complaint. Please try again.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate estimated time if provided
    if (formData.estimated_completion_time) {
      const time = parseInt(formData.estimated_completion_time);
      if (isNaN(time) || time <= 0 || time > 30) {
        setError('Estimated completion time must be between 1 and 30 minutes');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      
      // Add estimated time if provided
      if (formData.estimated_completion_time) {
        formDataToSend.append('estimated_completion_time', formData.estimated_completion_time);
      }

      // Add files if any
      files.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Complaint submitted successfully!');
        setFormData({ title: '', description: '', estimated_completion_time: '' });
        setFiles([]);
        setClassification(null);
      } else {
        setError(data.message || 'Failed to submit complaint');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Technical': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Academic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Hostel/Mess': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Maintenance': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Submit New Complaint</h2>
            <p className="text-gray-600">Describe your issue and we'll help you get it resolved</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Complaint Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Brief description of your issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Please provide detailed information about your issue..."
              required
            />
          </div>

          {/* Estimated Completion Time - Beautiful Design */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <label htmlFor="estimated_completion_time" className="block text-base font-semibold text-gray-900 mb-1">
                  Estimated Resolution Time
                </label>
                <p className="text-sm text-gray-600">
                  How long do you think it will take to resolve this issue?
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quick Select Buttons — max 30 min */}
              <div className="md:col-span-2 flex flex-wrap gap-2">
                {[5, 10, 15, 20, 30].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, estimated_completion_time: minutes.toString() }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.estimated_completion_time === minutes.toString()
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              
              {/* Custom Input — capped at 30 */}
              <div className="relative">
                <input
                  type="number"
                  id="estimated_completion_time"
                  name="estimated_completion_time"
                  value={formData.estimated_completion_time}
                  onChange={e => {
                    const val = Math.min(30, Math.max(1, parseInt(e.target.value) || 0));
                    setFormData(prev => ({ ...prev, estimated_completion_time: e.target.value === '' ? '' : val.toString() }));
                  }}
                  min="1"
                  max="30"
                  className="w-full px-4 py-2 pr-16 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium"
                  placeholder="Custom"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-sm font-medium text-gray-500">min</span>
                </div>
              </div>
            </div>
            
            {/* Info Banner */}
            <div className="mt-4 flex items-center space-x-2 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-200">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs text-gray-700">
                <span className="font-semibold">Optional:</span> Maximum 30 minutes. Quick tasks (≤ 30 min) get priority assignment — staff will be assigned immediately regardless of current workload.
              </p>
            </div>
            
            {/* Visual Time Display */}
            {formData.estimated_completion_time && parseInt(formData.estimated_completion_time) > 0 && parseInt(formData.estimated_completion_time) <= 30 && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{formData.estimated_completion_time}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Estimated Time</p>
                      <p className="text-xs text-gray-600">
                        {parseInt(formData.estimated_completion_time) <= 10 ? '⚡ Quick fix — priority assignment' :
                         parseInt(formData.estimated_completion_time) <= 20 ? '🔄 Fast resolution — priority assignment' :
                         '✅ Standard quick task — priority assignment'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, estimated_completion_time: '' }))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Classification Button */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={classifyComplaint}
              disabled={!formData.title.trim() || !formData.description.trim() || isClassifying}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClassifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Classifying...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  <span>Classify Complaint</span>
                </>
              )}
            </button>
            
            {classification && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircleSolidIcon className="h-5 w-5" />
                <span>Classified successfully</span>
              </div>
            )}
          </div>

                     {/* Classification Results */}
           {classification && (
             <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
               <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Classification Results</h3>
               {console.log('Rendering classification:', classification)}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className={`p-4 rounded-xl border ${getCategoryColor(classification.category)}`}>
                   <div className="flex items-center space-x-2">
                     <DocumentTextIcon className="h-5 w-5" />
                     <span className="font-medium">Category</span>
                   </div>
                   <p className="text-lg font-semibold mt-1">{classification.category || 'N/A'}</p>
                 </div>
                 <div className={`p-4 rounded-xl border ${getPriorityColor(classification.priority)}`}>
                   <div className="flex items-center space-x-2">
                     <ExclamationTriangleIcon className="h-5 w-5" />
                     <span className="font-medium">Priority</span>
                   </div>
                   <p className="text-lg font-semibold mt-1 capitalize">{classification.priority || 'N/A'}</p>
                 </div>
               </div>
               <p className="text-sm text-gray-600 mt-3">
                 <span className="font-medium">Method:</span> BERT Based Classification
               </p>
             </div>
           )}

          {/* File Upload */}
          <div>
            <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="files"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <label htmlFor="files" className="cursor-pointer">
                <div className="text-center">
                  <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Images, PDF, DOC files up to 10MB each
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Raise Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Auto Raise Popup Component
function AutoRaisePopup({ isOpen, onClose, user }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [complaintDetails, setComplaintDetails] = useState({
    title: '',
    description: ''
  });
  const [classification, setClassification] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // Add welcome message when popup is opened
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: `Hello ${user?.name}! I can help you generate and raise a complaint. Please describe your issue, and I'll help you classify and submit it.`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, user?.name]);

  // Function to optimize description
  const optimizeDescription = (description) => {
    // Remove any redundant information
    let optimized = description.trim();
    
    // Ensure it's concise but detailed enough
    if (optimized.length > 500) {
      optimized = optimized.substring(0, 497) + '...';
    }
    
    return optimized;
  };

  // Function to generate complaint details using user input
  const generateComplaintDetails = async (userInput) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    setClassification(null);
    
    try {
      // First, try to use the chatbot API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Based on this description: "${userInput}", generate a formal complaint. I am ${user?.name}, a ${user?.role} with email ${user?.email}. Create a complaint title and description based on my input. Make the description detailed but concise. Format your response with "Title:" and "Description:" labels.`,
          user_id: user?.id,
          user_role: user?.role
        })
      });

      const data = await response.json();

      if (data.success && data.bot_response) {
        // Extract title and description from AI response
        const aiResponse = data.bot_response;
        const titleMatch = aiResponse.match(/Title:\s*([^\n]+)/i);
        const descriptionMatch = aiResponse.match(/Description:\s*([\s\S]+?)(?=\n\n|$)/i);
        
        let title = titleMatch ? titleMatch[1].trim() : '';
        let description = descriptionMatch ? descriptionMatch[1].trim() : '';
        
        // If AI didn't format properly, use fallback generation
        if (!title || !description) {
          const fallbackResult = generateFallbackComplaint(userInput);
          title = fallbackResult.title;
          description = fallbackResult.description;
        }
        
        // Optimize the description
        description = optimizeDescription(description);
        
        const complaintData = {
          title,
          description
        };
        
        setComplaintDetails(complaintData);
        
        // Classify the complaint
        const classificationResult = await classifyComplaint(title, description);
        
        // Add bot message with the generated complaint
        const botMessage = {
          id: Date.now() + 1,
          text: `I've generated a complaint based on your input:\n\n**Title**: ${title}\n\n**Description**:\n${description}\n\n**Category**: ${classificationResult.category}\n**Priority**: ${classificationResult.priority.charAt(0).toUpperCase() + classificationResult.priority.slice(1)}\n\nWould you like to raise this complaint? Type "yes" to submit or "no" to cancel.`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          complaintData: complaintData,
          classification: classificationResult
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Use fallback generation if API fails
        const fallbackResult = generateFallbackComplaint(userInput);
        const complaintData = {
          title: fallbackResult.title,
          description: fallbackResult.description
        };
        
        setComplaintDetails(complaintData);
        
        // Classify the complaint
        const classificationResult = await classifyComplaint(complaintData.title, complaintData.description);
        
        // Add bot message with the generated complaint
        const botMessage = {
          id: Date.now() + 1,
          text: `I've generated a complaint based on your input:\n\n**Title**: ${complaintData.title}\n\n**Description**:\n${complaintData.description}\n\n**Category**: ${classificationResult.category}\n**Priority**: ${classificationResult.priority.charAt(0).toUpperCase() + classificationResult.priority.slice(1)}\n\nWould you like to raise this complaint? Type "yes" to submit or "no" to cancel.`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          complaintData: complaintData,
          classification: classificationResult
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error generating complaint:', error);
      
      // Use fallback generation on error
      const fallbackResult = generateFallbackComplaint(userInput);
      const complaintData = {
        title: fallbackResult.title,
        description: fallbackResult.description
      };
      
      setComplaintDetails(complaintData);
      
      try {
        // Try to classify even if generation failed
        const classificationResult = await classifyComplaint(complaintData.title, complaintData.description);
        
        const botMessage = {
          id: Date.now() + 1,
          text: `I've generated a complaint based on your input:\n\n**Title**: ${complaintData.title}\n\n**Description**:\n${complaintData.description}\n\n**Category**: ${classificationResult.category}\n**Priority**: ${classificationResult.priority.charAt(0).toUpperCase() + classificationResult.priority.slice(1)}\n\nWould you like to raise this complaint? Type "yes" to submit or "no" to cancel.`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          complaintData: complaintData,
          classification: classificationResult
        };
        
        setMessages(prev => [...prev, botMessage]);
      } catch (classifyError) {
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Sorry, I had trouble processing your request. Please try again or submit your complaint manually.',
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback function to generate complaint without AI
  const generateFallbackComplaint = (userInput) => {
    // Extract key information from user input
    const words = userInput.toLowerCase().split(' ');
    
    // Generate a title (first 8-10 words, capitalized)
    const titleWords = userInput.split(' ').slice(0, 10);
    let title = titleWords.join(' ');
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Generate description with proper formatting
    let description = userInput.trim();
    
    // Add context if description is too short
    if (description.length < 50) {
      description = `I am experiencing an issue: ${description}. This needs to be addressed as soon as possible.`;
    }
    
    // Ensure proper capitalization and punctuation
    description = description.charAt(0).toUpperCase() + description.slice(1);
    if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
      description += '.';
    }
    
    return { title, description };
  };

  // Function to classify complaint
  const classifyComplaint = async (title, description) => {
    if (!title || !description) {
      setError('Title and description are required for classification');
      return { category: 'General', priority: 'medium' };
    }

    setIsClassifying(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ml/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `${title} ${description}`
        })
      });

      const data = await response.json();

      if (data.success) {
        const classificationData = {
          category: data.data.predicted_category,
          priority: data.data.predicted_priority,
          method: data.data.classification_method
        };
        setClassification(classificationData);
        return classificationData;
      } else {
        setError(data.message || 'Classification failed');
        return { category: 'General', priority: 'medium' };
      }
    } catch (error) {
      setError('Failed to classify complaint. Please try again.');
      return { category: 'General', priority: 'medium' };
    } finally {
      setIsClassifying(false);
    }
  };

  // Function to submit the complaint
  const submitComplaint = async () => {
    setIsConfirming(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', complaintDetails.title.trim());
      formData.append('description', complaintDetails.description.trim());

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const ticketId = data.data?.complaint?.ticket_id || 'Generated';
        setSuccess('Complaint submitted successfully!');
        
        const successMessage = {
          id: Date.now(),
          text: `✅ Complaint submitted successfully!\n\nTicket ID: ${ticketId}\n\nYou can track the status of your complaint in the Track Progress section.`,
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, successMessage]);
        setComplaintDetails({ title: '', description: '' });
        setClassification(null);
        
        // Close the popup after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to submit complaint');
        
        const errorMessage = {
          id: Date.now(),
          text: `❌ Failed to submit complaint: ${data.message || 'Please try again.'}`,
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      
      const errorMessage = {
        id: Date.now(),
        text: '❌ Network error. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsConfirming(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Technical': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Academic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Hostel/Mess': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Maintenance': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const sendMessage = (message) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Process user message
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('yes') && (complaintDetails.title || complaintDetails.description)) {
      // User confirms to submit the complaint
      submitComplaint();
    } else if (lowerMessage.includes('no') && (complaintDetails.title || complaintDetails.description)) {
      // User declines to submit the complaint
      const botMessage = {
        id: Date.now() + 1,
        text: 'I\'ve cancelled the complaint submission. Is there anything else you\'d like to do?',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setComplaintDetails({ title: '', description: '' });
      setClassification(null);
    } else {
      // Generate complaint based on user input
      generateComplaintDetails(message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const formatMessage = (text) => {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Popup */}
      <div className="relative w-full max-w-2xl h-[85vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Auto Raise</h2>
              <p className="text-sm text-gray-600">Describe your issue and I'll help you raise a complaint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto Raise Complaint</h3>
                <p className="text-gray-600 mb-4">Describe your issue and I'll help you raise a complaint</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">📝 Describe Your Issue</h4>
                    <p className="text-sm text-gray-600">Tell me about your problem in detail</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">✅ Review & Submit</h4>
                    <p className="text-sm text-gray-600">I'll generate a formal complaint for your approval</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-2xl px-6 py-4 shadow-sm border ${message.sender === 'user' ? 'border-blue-200' : 'border-gray-200'}`}>
                  <div 
                    className="prose prose-sm max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                  />
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50">
                    <div className="flex items-center space-x-2">
                      {message.sender === 'bot' && (
                        <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <DocumentTextIcon className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span className="text-xs opacity-70">
                        {message.sender === 'user' ? 'You' : 'Auto Raise'}
                      </span>
                    </div>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-200 max-w-[85%]">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <DocumentTextIcon className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">Generating complaint...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && !messages.find(m => m.text.includes(error)) && (
              <div className="flex justify-start">
                <div className="bg-red-50 text-red-700 rounded-2xl px-6 py-4 shadow-sm border border-red-200 max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe your issue or respond to questions..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/80 backdrop-blur-sm"
                  disabled={isLoading || isConfirming}
                />
                <button
                  type="submit"
                  disabled={isLoading || isConfirming || !inputMessage.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {complaintDetails.title ? 'Type "yes" to submit the complaint or "no" to cancel' : 'Describe your issue in detail for better results'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Assistant Chat Popup Component
function AIAssistantPopup({ isOpen, onClose, user }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: message,
          user_id: user?.id,
          user_role: user?.role
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: data.bot_response,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          complaintData: data.complaint_data || null
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        setError(data.message || 'Failed to get response from AI assistant');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const formatMessage = (text) => {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/📋|🎫|👤|📝|💻|🔴|🟡|📅|🔄|📎|⏳|🤖/g, '')
      .replace(/\n/g, '<br>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Popup */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-600">Ask me anything about your complaints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AI Assistant</h3>
                <p className="text-gray-600 mb-4">I'm here to help you with your complaints and queries</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">📋 Check Complaint Status</h4>
                    <p className="text-sm text-gray-600">Ask about your ticket status and progress</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">🔍 General Questions</h4>
                    <p className="text-sm text-gray-600">Get help with any complaint-related queries</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-2xl px-6 py-4 shadow-sm border ${message.sender === 'user' ? 'border-blue-200' : 'border-gray-200'}`}>
                  <div 
                    className="prose prose-sm max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                  />
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50">
                    <div className="flex items-center space-x-2">
                      {message.sender === 'bot' && (
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <SparklesIcon className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span className="text-xs opacity-70">
                        {message.sender === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                    </div>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-200 max-w-[85%]">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <SparklesIcon className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 text-red-700 rounded-2xl px-6 py-4 shadow-sm border border-red-200 max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about your complaints..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/80 backdrop-blur-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Track Progress Component
function TrackProgressSection({ user }) {
  const { token } = useAuth();
  const [ticketId, setTicketId] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    feedback_text: ''
  });

  const searchComplaint = async () => {
    if (!ticketId.trim()) {
      setError('Please enter a ticket ID');
      return;
    }

    setLoading(true);
    setError('');
    setComplaint(null);
    setSearched(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/check-status?ticket_id=${ticketId.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.has_complaint_data) {
        setComplaint(data.complaint_data);
      } else {
        setError(data.message || 'Complaint not found');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchComplaint();
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'pending': return 1;
      case 'in_progress': return 2;
      case 'resolved': return 3;
      case 'closed': return 3;
      default: return 1;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const submitFeedback = async (complaintId) => {
    if (!feedbackForm.rating) {
      alert('Please select a rating');
      return;
    }

    setSubmittingFeedback(complaintId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/${complaintId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(feedbackForm)
      });

      const data = await response.json();
      if (data.success) {
        alert('Feedback submitted successfully!');
        setFeedbackForm({ rating: 0, feedback_text: '' });
        // Refresh the complaint data to show the feedback
        searchComplaint();
      } else {
        alert(data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('Error submitting feedback');
    } finally {
      setSubmittingFeedback(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <ClockIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Track Progress</h2>
            <p className="text-gray-600">Enter your ticket ID to track the status of your complaint</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="ticketId" className="block text-sm font-medium text-gray-700 mb-2">
              Ticket ID
            </label>
            <div className="flex space-x-4">
              <input
                type="text"
                id="ticketId"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                placeholder="Enter your ticket ID (e.g., CMP20241201ABCD)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-mono"
                required
              />
              <button
                type="submit"
                disabled={loading || !ticketId.trim()}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <span>Track</span>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
      </div>

      {/* Progress Display - Horizontal Layout */}
      {complaint && (
        <div className="space-y-6">
          {/* Complaint Details */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{complaint.title}</h3>
                  <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                    {complaint.ticket_id}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{complaint.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>
                    {complaint.status.replace('_', ' ')}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Created: {formatDate(complaint.created_at)}</span>
                  {complaint.resolved_at && (
                    <span>Resolved: {formatDate(complaint.resolved_at)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Steps - Horizontal Layout */}
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-6">Progress Timeline</h4>
              <div className="relative">
                {/* Progress Line - Horizontal */}
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200"></div>
                
                {/* Steps - Horizontal Layout */}
                <div className="flex justify-between relative z-10">
                  {/* Step 1: Raised */}
                  <div className="flex flex-col items-center w-1/3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full mb-4">
                      <CheckCircleIcon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <h5 className="text-base font-semibold text-gray-900">Complaint Raised</h5>
                      <p className="text-sm text-gray-600 mb-1">Successfully submitted</p>
                      <p className="text-xs text-gray-500">{formatDate(complaint.created_at)}</p>
                    </div>
                  </div>

                  {/* Step 2: In Progress */}
                  <div className="flex flex-col items-center w-1/3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-4 ${
                      getStatusStep(complaint.status) >= 2 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {getStatusStep(complaint.status) >= 2 ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <ClockIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <h5 className="text-base font-semibold text-gray-900">Under Review</h5>
                      <p className="text-sm text-gray-600 mb-1">Being reviewed</p>
                      {complaint.status === 'in_progress' && (
                        <p className="text-xs text-blue-600 font-medium">In progress</p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Completed */}
                  <div className="flex flex-col items-center w-1/3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-4 ${
                      getStatusStep(complaint.status) >= 3 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {getStatusStep(complaint.status) >= 3 ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <ClockIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <h5 className="text-base font-semibold text-gray-900">Completed</h5>
                      <p className="text-sm text-gray-600 mb-1">Complaint resolved</p>
                      {complaint.status === 'resolved' && (
                        <p className="text-xs text-green-600 font-medium">Successfully resolved</p>
                      )}
                      {complaint.resolved_at && (
                        <p className="text-xs text-gray-500">{formatDate(complaint.resolved_at)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Response */}
            {complaint.admin_response && (
              <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h5 className="text-lg font-semibold text-blue-900 mb-3">Admin Response</h5>
                <p className="text-blue-800 leading-relaxed">{complaint.admin_response}</p>
              </div>
            )}

            {/* Attachments */}
            {complaint.attachments && complaint.attachments.length > 0 && (
              <div className="mt-8">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {complaint.attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      {attachment.file_type.startsWith('image/') ? (
                        <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                          <img
                            src={attachment.file_url}
                            alt={attachment.original_filename}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                  <svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 rounded-b-xl">
                        <p className="truncate font-medium">{attachment.original_filename}</p>
                        <p className="text-xs opacity-75">{attachment.file_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section for Completed Complaints */}
            {(complaint.status === 'resolved' || complaint.status === 'closed') && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <h5 className="text-lg font-semibold text-green-900 mb-4">Rate Your Experience</h5>
                <p className="text-green-800 mb-4">
                  Your complaint has been resolved! Please take a moment to rate your experience and provide feedback.
                </p>
                
                {complaint.feedback ? (
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <h6 className="font-medium text-green-900 mb-2">Your Feedback:</h6>
                    <div className="flex items-center mb-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-lg">
                            {star <= complaint.feedback.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {complaint.feedback.rating}/5 stars
                      </span>
                    </div>
                    {complaint.feedback.feedback_text && (
                      <p className="text-green-800">{complaint.feedback.feedback_text}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-2">
                        Rate your experience (1-5 stars):
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackForm(prev => ({ ...prev, rating: star }))}
                            className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                          >
                            {star <= (feedbackForm?.rating || 0) ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-2">
                        Additional feedback (optional):
                      </label>
                      <textarea
                        value={feedbackForm?.feedback_text || ''}
                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_text: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Share your experience with our service..."
                      />
                    </div>
                    <button
                      onClick={() => submitFeedback(complaint.id)}
                      disabled={!feedbackForm?.rating || submittingFeedback === complaint.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingFeedback === complaint.id ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {searched && !complaint && !loading && !error && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No complaint found</h3>
          <p className="text-gray-600">Please check your ticket ID and try again.</p>
        </div>
      )}
    </div>
  );
}

// Reports Component
function ReportsSection({ user }) {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [complaintTypes, setComplaintTypes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0
  });

  const fetchComplaints = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString()
      });

      const endpoint = user?.role === 'admin' 
        ? `${import.meta.env.VITE_API_URL}/api/complaints/all`
        : `${import.meta.env.VITE_API_URL}/api/complaints/my-complaints`;

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setComplaints(data.data.complaints);
        setPagination(prev => ({
          ...prev,
          page: data.data.pagination.page,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages,
          has_next: data.data.pagination.has_next,
          has_prev: data.data.pagination.has_prev
        }));
      } else {
        setError(data.message || 'Failed to fetch complaints');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchStats();
    fetchComplaintTypes();
  }, []);
  
  // Commented out as requested
  const fetchComplaintTypes = async () => {
    try {
      setLoading(true);
      // This would normally fetch from an API endpoint
      // For now, we'll use mock data similar to admin dashboard
      // Mock data removed as requested
      setComplaintTypes([]);
    } catch (error) {
      console.error('Error fetching complaint types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchComplaints(newPage);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Technical': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Academic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Hostel/Mess': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Maintenance': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Complaint Reports</h2>
            <p className="text-gray-600">View and manage all your complaints with detailed information</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_complaints}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.status_stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.status_stats.in_progress}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.status_stats.resolved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Complaint Types Section Removed as Requested */}
      {/* <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaint Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {complaintTypes.map((type, index) => (
            <div key={index} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{type.name}</h4>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
              </div>
              <p className="text-2xl font-bold" style={{ color: type.color }}>{type.count}</p>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    backgroundColor: type.color,
                    width: `${(type.count / complaintTypes.reduce((acc, curr) => acc + curr.count, 0)) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div> */}



      {/* Complaints List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Complaints</h3>
          <p className="text-sm text-gray-600">
            Showing {complaints.length} of {pagination.total} complaints
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading complaints...</span>
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or create a new complaint.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col h-full">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-gray-900 truncate">{complaint.title}</h4>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {complaint.ticket_id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{complaint.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>
                      {complaint.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(complaint.category)}`}>
                      {complaint.category}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    <div>Created: {formatDate(complaint.created_at)}</div>
                    {complaint.resolved_at && (
                      <div>Resolved: {formatDate(complaint.resolved_at)}</div>
                    )}
                  </div>
                </div>

                {/* Attachments - Compact */}
                {complaint.attachments && complaint.attachments.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center text-xs font-medium text-gray-700 mb-1">
                      <PaperClipIcon className="h-3 w-3 mr-1" />
                      <span>Attachments: {complaint.attachments.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {complaint.attachments.map((attachment, index) => (
                        <div 
                          key={index} 
                          className={`relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors ${attachment.file_type.startsWith('image/') ? 'cursor-pointer' : ''}`}
                        >
                          {attachment.file_type.startsWith('image/') ? (
                            <>
                              <img
                                src={attachment.file_url}
                                alt={attachment.original_filename}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                      <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  `;
                                }}
                              />
                              <div 
                                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center group"
                              >
                                <EyeIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center p-1 cursor-pointer">
                              <DocumentTextIcon className="h-5 w-5 text-gray-400 mb-0.5" />
                              <span className="text-[8px] text-gray-500 text-center truncate w-full">
                                {attachment.original_filename.split('.').pop().toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Response - Compact */}
                {complaint.admin_response && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                    <h5 className="font-medium text-blue-900 mb-1">Admin Response:</h5>
                    <p className="text-blue-800 line-clamp-2">{complaint.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_prev}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackSection({ user }) {
  const { token } = useAuth();
  const [resolvedComplaints, setResolvedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    feedback_text: ''
  });

  useEffect(() => {
    fetchResolvedComplaints();
  }, []);

  const fetchResolvedComplaints = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/my-complaints`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        const resolved = data.data.filter(complaint => 
          complaint.status === 'resolved' || complaint.status === 'closed'
        );
        setResolvedComplaints(resolved);
      }
    } catch (error) {
      console.error('Error fetching resolved complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (rating) => {
    setFeedbackForm(prev => ({ ...prev, rating }));
  };

  const handleFeedbackTextChange = (e) => {
    setFeedbackForm(prev => ({ ...prev, feedback_text: e.target.value }));
  };

  const submitFeedback = async (complaintId) => {
    if (feedbackForm.rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmittingFeedback(complaintId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/${complaintId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(feedbackForm)
      });

      const data = await response.json();
      if (data.success) {
        alert('Feedback submitted successfully!');
        setFeedbackForm({ rating: 0, feedback_text: '' });
        fetchResolvedComplaints(); // Refresh the list
      } else {
        alert(data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('Error submitting feedback');
    } finally {
      setSubmittingFeedback(null);
    }
  };

  const StarRating = ({ rating, onRatingChange, disabled = false }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onRatingChange(star)}
          className={`text-2xl ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          {star <= rating ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resolved complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Feedback & Rating</h2>
        <p className="text-gray-600 mb-6">
          Rate and provide feedback for your resolved complaints. Your feedback helps us improve our service.
        </p>

        {resolvedComplaints.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resolved complaints</h3>
            <p className="text-gray-600">You don't have any resolved complaints to provide feedback for.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {resolvedComplaints.map((complaint) => (
              <div key={complaint.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                    <p className="text-sm text-gray-600">Ticket ID: {complaint.ticket_id}</p>
                    <p className="text-sm text-gray-600">
                      Resolved: {new Date(complaint.resolved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700">{complaint.description}</p>
                </div>

                {complaint.admin_response && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-medium text-blue-900 mb-2">Admin Response:</h4>
                    <p className="text-blue-800">{complaint.admin_response}</p>
                  </div>
                )}

                {complaint.feedback ? (
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-medium text-green-900 mb-2">Your Feedback:</h4>
                    <div className="flex items-center mb-2">
                      <StarRating rating={complaint.feedback.rating} disabled={true} />
                      <span className="ml-2 text-sm text-gray-600">
                        {complaint.feedback.rating}/5 stars
                      </span>
                    </div>
                    {complaint.feedback.feedback_text && (
                      <p className="text-green-800">{complaint.feedback.feedback_text}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate your experience (1-5 stars):
                      </label>
                      <StarRating 
                        rating={feedbackForm.rating} 
                        onRatingChange={handleRatingChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional feedback (optional):
                      </label>
                      <textarea
                        value={feedbackForm.feedback_text}
                        onChange={handleFeedbackTextChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Share your experience with our service..."
                      />
                    </div>
                    <button
                      onClick={() => submitFeedback(complaint.id)}
                      disabled={submittingFeedback === complaint.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingFeedback === complaint.id ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommunitySection({ user }) {
  const { token } = useAuth();
  const [communityComplaints, setCommunityComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCommunityComplaints();
  }, [currentPage]);

  const fetchCommunityComplaints = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/community?page=${currentPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCommunityComplaints(data.data.complaints);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching community complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Technical': return 'bg-blue-100 text-blue-800';
      case 'Academic': return 'bg-purple-100 text-purple-800';
      case 'Hostel/Mess': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading community complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Community</h2>
        <p className="text-gray-600 mb-6">
          View recent resolved complaints from the community. User identities are anonymized for privacy.
        </p>

        {communityComplaints.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No community complaints</h3>
            <p className="text-gray-600">No resolved complaints are available in the community yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {communityComplaints.map((complaint) => (
              <div key={complaint.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                    <p className="text-sm text-gray-600">Ticket ID: {complaint.ticket_id}</p>
                    <p className="text-sm text-gray-600">
                      By: {complaint.anonymous_user} • Resolved: {formatDate(complaint.resolved_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(complaint.category)}`}>
                      {complaint.category}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700">{complaint.description}</p>
                </div>

                {complaint.admin_response && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-medium text-blue-900 mb-2">Admin Response:</h4>
                    <p className="text-blue-800">{complaint.admin_response}</p>
                  </div>
                )}

                {complaint.feedback && (
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-medium text-green-900 mb-2">User Feedback:</h4>
                    <div className="flex items-center mb-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-lg">
                            {star <= complaint.feedback.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {complaint.feedback.rating}/5 stars
                      </span>
                    </div>
                    {complaint.feedback.feedback_text && (
                      <p className="text-green-800">{complaint.feedback.feedback_text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [autoRaiseOpen, setAutoRaiseOpen] = useState(false);

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleIcon = (role) => {
    return role === 'student' ? AcademicCapIcon : UserGroupIcon;
  };

  const getRoleColor = (role) => {
    return role === 'student' ? 'text-blue-600' : 'text-purple-600';
  };

  const RoleIcon = getRoleIcon(user?.role);
  const roleColor = getRoleColor(user?.role);

  const navigation = [
    { name: 'Dashboard', icon: DocumentTextIcon, href: 'dashboard', current: activeSection === 'dashboard' },
    { name: 'New Complaint', icon: DocumentTextIcon, href: 'new-complaint', current: activeSection === 'new-complaint' },
    { name: 'Track Progress', icon: ClockIcon, href: 'track-progress', current: activeSection === 'track-progress' },
    // Mail item removed from sidebar
    { name: 'Feedback & Rating', icon: SparklesIcon, href: 'feedback', current: activeSection === 'feedback' },
    { name: 'Community', icon: UserGroupIcon, href: 'community', current: activeSection === 'community' },
    { name: 'Reports', icon: ChartBarIcon, href: 'reports', current: activeSection === 'reports' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center ${roleColor}`}>
                  <RoleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h2>
                  <p className="text-gray-600">Manage your complaints and track their progress</p>
                </div>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{user?.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <RoleIcon className={`h-5 w-5 ${roleColor}`} />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setActiveSection('new-complaint')}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">New Complaint</h3>
                <p className="text-sm text-gray-600">Submit a new complaint or issue</p>
              </div>

              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setActiveSection('track-progress')}
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Progress</h3>
                <p className="text-sm text-gray-600">Monitor your complaint status</p>
              </div>

              {/* Mail quick action removed for consistency */}

              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setActiveSection('feedback')}
              >
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                  <SparklesIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback</h3>
                <p className="text-sm text-gray-600">Rate and provide feedback</p>
              </div>

              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setActiveSection('community')}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Community</h3>
                <p className="text-sm text-gray-600">View community complaints</p>
              </div>

              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setActiveSection('reports')}
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
                <p className="text-sm text-gray-600">Generate complaint reports</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Hostel WiFi Issue</span>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">Cafeteria Service</span>
                  </div>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Library Access</span>
                  </div>
                  <span className="text-xs text-gray-500">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'new-complaint':
        return <NewComplaintForm user={user} />;
      
      case 'track-progress':
        return <TrackProgressSection user={user} />;
      
      case 'mail':
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <EnvelopeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Mail</h2>
                <p className="text-gray-600">View and manage your complaint notifications</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="font-medium text-blue-900">Complaint Status Update</h3>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-sm text-blue-800 mt-2">Your complaint #CMP20241201ABCD has been updated to 'In Progress'</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h3 className="font-medium text-green-900">Complaint Resolved</h3>
                  </div>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <p className="text-sm text-green-800 mt-2">Your complaint #CMP20241130WXYZ has been resolved</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <h3 className="font-medium text-gray-900">New Announcement</h3>
                  </div>
                  <span className="text-xs text-gray-500">3 days ago</span>
                </div>
                <p className="text-sm text-gray-800 mt-2">System maintenance scheduled for next weekend</p>
              </div>
            </div>
          </div>
        );
      
      case 'feedback':
        return <FeedbackSection user={user} />;
      
      case 'community':
        return <CommunitySection user={user} />;
      
      case 'reports':
        return <ReportsSection user={user} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ml-4 lg:ml-0">
                  Complaint Care
                </h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden sm:flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{user?.name}</span>
                </div>
                <button 
                  onClick={() => setAiAssistantOpen(true)}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors bg-white/50 rounded-lg"
                >
                  <SparklesIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">AI Assistant</span>
                </button>
                <button 
                  onClick={() => setAutoRaiseOpen(true)}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-sm text-gray-700 hover:text-green-600 transition-colors bg-white/50 rounded-lg"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Auto Raise</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar - Sticky */}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white backdrop-blur-sm transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative lg:h-full transition duration-300 ease-in-out shadow-xl lg:shadow-none overflow-y-auto border-r border-gray-200`}>
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="mt-6 px-4">
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        setActiveSection(item.href);
                        setSidebarOpen(false); // Close sidebar on mobile after selection
                      }}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                        item.current
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  </li>
                ))}
                
                {/* Logout Button */}
                <li className="pt-4 mt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSidebarOpen(false); // Close sidebar on mobile before logout
                      handleLogout();
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 lg:ml-0 overflow-y-auto">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
              <div className="transition-all duration-300 ease-in-out">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>

                 {/* Mobile sidebar overlay */}
         {sidebarOpen && (
           <div
             className="fixed inset-0 z-40 bg-transparent lg:hidden"
             onClick={() => setSidebarOpen(false)}
           />
         )}

         {/* AI Assistant Popup */}
         <AIAssistantPopup 
           isOpen={aiAssistantOpen}
           onClose={() => setAiAssistantOpen(false)}
           user={user}
         />

         {/* Auto Raise Popup */}
         <AutoRaisePopup
           isOpen={autoRaiseOpen}
           onClose={() => setAutoRaiseOpen(false)}
           user={user}
         />
       </div>
     </div>
   );
 }

export default Dashboard;