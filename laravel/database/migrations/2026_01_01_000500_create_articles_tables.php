<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Articles (`articles`) and their tags.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 75);
            $table->string('title', 100);
            $table->string('excerpt', 300)->default('');
            $table->longText('content');
            $table->string('featured_image_url', 500)->comment('featuredImage.url');
            $table->string('featured_image_alt', 200)->comment('featuredImage.alt');
            $table->string('featured_image_caption', 300)->nullable()->comment('featuredImage.caption');
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('author_id');
            $table->string('status', 40)->default('draft')->comment('draft|scheduled|published|archived');
            $table->dateTime('published_at', 3)->nullable();
            $table->dateTime('updated_at_display', 3)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('allow_comments')->default(false);
            $table->json('related_article_ids')->nullable();
            $table->json('related_property_ids')->nullable();
            $table->json('faqs')->nullable();
            $table->boolean('table_of_contents')->default(true);
            $table->json('seo')->nullable();
            $table->longText('content_text')->nullable();
            $table->integer('reading_time_minutes')->default(0);
            $table->integer('word_count')->default(0);
            $table->integer('view_count')->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->softDeletesDatetime('deleted_at', 3)->comment('soft delete');
            $table->unique(['slug'], 'articles_slug_unique');
            $table->index(['category_id'], 'articles_category_id_index');
            $table->index(['author_id'], 'articles_author_id_index');
            $table->index(['is_featured'], 'articles_is_featured_index');
            $table->index(['published_at'], 'articles_published_at_index');
            $table->index(['status'], 'articles_status_index');
            $table->fullText(['title', 'content_text'], 'articles_fulltext');
            $table->foreign('category_id', 'articles_category_id_foreign')->references('id')->on('article_categories')->restrictOnDelete();
            $table->foreign('author_id', 'articles_author_id_foreign')->references('id')->on('authors')->restrictOnDelete();
            $table->foreign('created_by', 'articles_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'articles_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });

        Schema::create('article_tag', function (Blueprint $table) {
            $table->unsignedBigInteger('article_id');
            $table->unsignedBigInteger('article_tag_id');
            $table->integer('position')->default(0)->comment('the order the admin chose');
            $table->primary(['article_id', 'article_tag_id']);
            $table->index(['article_tag_id'], 'article_tag_article_tag_id_index');
            $table->foreign('article_id', 'article_tag_article_id_foreign')->references('id')->on('articles')->cascadeOnDelete();
            $table->foreign('article_tag_id', 'article_tag_article_tag_id_foreign')->references('id')->on('article_tags')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_tag');
        Schema::dropIfExists('articles');
    }
};
