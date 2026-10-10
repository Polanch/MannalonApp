Farmer Posts Feature - Implementation Summary
 1) Database Tables (V6 Migration)
-- farmer_posts
CREATE TABLE farmer_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_user_id VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    media_path VARCHAR(255),
    media_type VARCHAR(10),  -- 'IMAGE' or 'VIDEO'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_farmer_posts_created_at (created_at),
    KEY idx_farmer_posts_farmer_user_id (farmer_user_id),
    CONSTRAINT fk_farmer_posts_farmer FOREIGN KEY (farmer_user_id) REFERENCES farmers(mobile_number)
);

-- farmer_post_comments
CREATE TABLE farmer_post_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    farmer_user_id VARCHAR(20) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_farmer_post_comments_post_id (post_id),
    CONSTRAINT fk_farmer_post_comments_post FOREIGN KEY (post_id) REFERENCES farmer_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_post_comments_farmer FOREIGN KEY (farmer_user_id) REFERENCES farmers(mobile_number)
);

-- farmer_post_reactions
CREATE TABLE farmer_post_reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    farmer_user_id VARCHAR(20) NOT NULL,
    reaction_type ENUM('UP', 'DOWN') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_farmer_post_reactions_post_user (post_id, farmer_user_id),
    CONSTRAINT fk_farmer_post_reactions_post FOREIGN KEY (post_id) REFERENCES farmer_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_post_reactions_farmer FOREIGN KEY (farmer_user_id) REFERENCES farmers(mobile_number)
);
 2) Files Created
Entities:
•
FarmerPost.java - Main post entity
•
FarmerPostComment.java - Comment entity
•
FarmerPostReaction.java - Reaction with enum (UP/DOWN)
DTOs:
•
PostDto - Post with counts, mediaUrl, author info
•
PostListResponse - Paginated response
•
CommentDto - Comment with ISO-8601 timestamps
•
ReactionResponse - Reaction counts
•
ReactionRequest / CommentRequest - Request bodies
•
ErrorResponse - JSON error responses
Repositories:
•
FarmerPostRepository - Queries for non-deleted posts (DESC by created_at)
•
FarmerPostCommentRepository - Ordered by created_at ASC
•
FarmerPostReactionRepository - Aggregate queries (upvotes, downvotes)
Service:
•
FarmerPostService - Business logic with validations:
◦
Content: max 5000 chars
◦
Comments: max 1000 chars
◦
Media: max 50MB, image/ or video/ only
◦
Random server-side filenames (UUID + extension)
◦
Farmer status validation (must be APPROVED in farmer_registrations)
Controller:
•
FarmerPostController - All 5 endpoints with proper error codes
 3) API Endpoints (all under /api/farmer)
 Method 
 Endpoint 
 Status 
 Response 
 GET 
 /posts?userId=...&page=0&size=10 
 200 
 PostListResponse 
 POST 
 /posts (multipart) 
 201 
 PostDto 
 PUT 
 /posts/{postId}/reaction 
 200 
 ReactionResponse 
 GET 
 /posts/{postId}/comments 
 200 
 CommentDto[] 
 POST 
 /posts/{postId}/comments 
 201 
 CommentDto 
 4) Enhanced Login Response
POST /api/auth/login now returns (for FARMER role):
{
  "success": true,
  "role": "FARMER",
  "status": "ACTIVE",
  "userId": "09123456789",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "fullName": "Juan Dela Cruz",
  "farmId": 5
}
 5) Configuration Updates
•
application.properties: max-file-size=50MB, max-request-size=60MB
•
UploadResourceConfig: Added /uploads/farmer-posts/ → uploads/farmer-posts/
•
CorsConfig: Already supports POST, PUT (PUT added per requirement)
•
Directory: Created uploads/farmer-posts/
 6) Key Features
✅ No N+1 queries (aggregate + joins in repositories)
 ✅ Cascading deletes on post deletion
 ✅ Unique reactions per post+user
 ✅ ISO-8601 timestamps in responses
 ✅ Random filenames (no path traversal risk)
 ✅ Active farmer validation on all endpoints
 ✅ Proper HTTP status codes (201 create, 403 forbidden, 404 not found, 400 validation)
 ✅ Mobile number as FK (reuses Farmer's PK)
 ✅ Soft-delete support (is_deleted flag)
Build Status: ✅ SUCCESS (80 source files compiled in 12.084s)