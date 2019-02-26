---
pageTitle: Store collections in JSONB field
publishedDate: 20. february 2019
---

You've probably heard about the JSON and JSONB datatypes that PostgreSQL database provides. When it comes to Rails the usual use of these types is to store key-value data (i.e. hashes) in it, either directly or using something more sophisticated like Virtus or Storext gems.

In this post I'm going to show you how you can use this datatype to store not just hashes, but collections of them and also take advantage of validations, casting and other nice features that Rails' models and attributes provide.

In other words we're going to mimic the has_many relationship but instead of using a separate table for the secondary model we're going to store the child models in a JSON(B) field in the primary table.

### Toy example

Let's say we want to store comments to a blog post. Normally we would create a normal _Comment_ model with it's own table and create a `has_many :comments` association on _Post_ model and `belongs_to :post` association on the _Comment_ model. In this example we're going to store the _Comment_ instances directly in the `posts` table.


### Migration

First we need to create the `posts` table with a `comments` JSONB field:

```ruby
class CreatePosts < ActiveRecord::Migration[5.2]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :body
      t.jsonb :comments

      t.timestamps
    end
    add_index :posts, :comments, using: :gin
  end
end
```

### Models and Serializers

Once we have the table we're going to write a very simple _Post_ model:
```ruby
class Post < ApplicationRecord
  serialize :comments, CommentsSerializer
end
```

The interesting part is line XXX where we're telling ActiveRecord to serialize comments into our `comments` field using a custom serializer that takes care of transforming our array of _Comment_ objects into the JSONB field when we save the _Post_ instance and transforming the JSON from the DB back into array of _Comment_ objects upon read:

```ruby
class CommentsSerializer
  # save to database
  def self.dump(comments=[])
    (comments || []).map &:to_hash
  end

  # load from database
  def self.load(comments=[])
    (comments || []).map do |c|
      Comment.new(c)
    end
  end
end
```

Now let's take a look at the _Comment_ model:
```ruby
class Comment
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :author, :string, default: 'Anonymous'
  attribute :body, :string

  validates_presence_of :author, :body
end
```

As you can see we're not inheriting from the ActiveRecord::Base class as we don't need all the standard machinery for working with a dedicated table. All we need to include is the ActiveModel::Model for validations and include ActiveModel::Attributes which allows us to define types and default values.

### Comment form

That's pretty much all on the model side. Now we can store _Comment_ instances inside of the _Post_ instances:
```ruby
post = Post.new(title: 'Hello!', body: 'World!')
post.comments << Comment.new(author: 'Rick', body: 'https://is.gd/2aLkKB')
post.save
```

Now let's see how we would handle the comment form on the blog post page. We're going to create a new route for adding new _Comment_ to a _Post_. This route will live inside of the `posts` resource and will be defined on a member of this resource, since a _Comment_ always belongs to a particular _Post_.

```ruby
resources :posts, only: [:index, :show] do
  post 'comments', to: 'posts#create_comment', on: :member
end
```

Let's create the _Posts_ controller with the _create_comment_ action that takes care of adding the submitted _Comment_ to the parent _Post_:
```ruby
class PostsController < ApplicationController

  before_action :load_post, only: [:show, :create_comment]

  def index
    @posts = Post.all.order(created_at: :desc).limit(10)
  end

  def show
    @comment = Comment.new
  end

  def create_comment
    @comment = Comment.new(comment_params)
    if @comment.valid?
      @post.comments << @comment
      @post.save
      redirect_to post_path(@post)
    else
      render :show
    end
  end


  private

  def load_post
    @post = Post.find(params[:id])
  end

  def comment_params
    params.require(:comment).permit(:author, :body)
  end
end
```

Finally, we need the views. View for the `index` action is pretty straightforward (we just need it it list the posts while rendering link to the `show` action for each), the `show` view is more interesting since it both lists the existing comments and displays the comment form (possibly with validation errors):
```ruby
<h2><%= @post.title %></h2>

<p><em>Published: <%= l @post.created_at %></em></p>

<div class="body">
  <%= @post.body %>
</div>

<hr>

<h3>Comments:</h3>

<% @post.comments.each do |comment| %>
  <div class="comment">
    <b><%= comment.author %></b> said: <%= comment.body %>
  </div>
<% end %>

<hr>

<h4>Add your comment!</h4>

<%= form_for @comment, url: comments_post_path, local: true do |f| %>
  <% @comment.errors.full_messages.each do |msg| %>
    <p><%= msg %></p>
  <% end %>

  <%= f.text_field :author %><br>
  <%= f.text_area :body %><br>
  <%= f.submit "Submit comment" %>
<% end %>
```

Now if you visit the post page you'll be able to see the full list of comments and also add a new one. Try to submit an invalid comment to see that the validation works.

If you look into the `posts` table in your database you'll see that the comments data is nicely stored as a JSON object on which you can then perform complex queries thanks to the index we've created.

So to recap: this is a nice and simple way to store embedded collections in a JSONB field while keeping rails goodies like validations, casting, etc. All plumbing like form helpers also work as you're used to. All you really need is a JSONB field, serializer and a lightweight non-AR model.

You can see the complete source code of a working demo project on my GitHub: [michalvalasek/rails_jsonb_collections](https://github.com/michalvalasek/rails_jsonb_collections)

Have an idea on how to improve this? Let me know!
