"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Code2, Database } from "lucide-react";

export default function ProjectStatus() {
  const completedFeatures = [
    { name: "Monorepo Setup", description: "pnpm + Turborepo configuration with apps/web, apps/api, apps/worker structure" },
    { name: "Next.js Initialization", description: "Next.js 15 + App Router + TailwindCSS + ShadCN UI base setup" },
    { name: "NestJS Template", description: "Basic NestJS project structure with module scaffolding" },
    { name: "Worker Template", description: "BullMQ + Redis worker service template structure" },
    { name: "UI Component Base", description: "ShadCN UI component templates (Badge, Button, Card, etc.)" },
    { name: "TypeScript Types", description: "Shared type definitions for Restaurant, Menu, Order, Auth schemas" },
    { name: "Landing Page", description: "Modern starter kit page with Lamp animation and Apple fonts" }
  ];

  const inProgressFeatures = [
    { name: "Database Setup", description: "Supabase project creation and table schema design", priority: "High" },
    { name: "Environment Config", description: "Setting up .env files with database and API keys", priority: "High" }
  ];

  const plannedFeatures = [
    { name: "Authentication System", description: "User registration, login, JWT token management" },
    { name: "Database Models", description: "Restaurant, Menu, Order, User table implementations" },
    { name: "API Endpoints", description: "REST API development for all core features" },
    { name: "Admin Dashboard UI", description: "Restaurant management interface" },
    { name: "Public Menu Pages", description: "QR-based menu display for customers" },
    { name: "Order Management", description: "Order creation, tracking, and status updates" },
    { name: "Payment Integration", description: "Stripe payment processing" },
    { name: "Queue System", description: "Background job processing with BullMQ" },
    { name: "3rd Party Sync", description: "Uber Eats / DoorDash order integration" },
    { name: "PWA Features", description: "Offline support and mobile optimization" },
    { name: "Reports & Analytics", description: "Sales reports and business insights" }
  ];

  const techStack = [
    { name: "Frontend", tech: "Next.js 15 + TypeScript", status: "completed" },
    { name: "UI Framework", tech: "TailwindCSS + ShadCN UI", status: "completed" },
    { name: "Backend", tech: "NestJS + TypeScript", status: "in-progress" },
    { name: "Database", tech: "Supabase PostgreSQL", status: "planned" },
    { name: "Queue System", tech: "BullMQ + Redis", status: "planned" },
    { name: "Authentication", tech: "JWT + Passport", status: "planned" },
    { name: "Worker Service", tech: "Background Jobs", status: "planned" },
    { name: "API Implementation", tech: "REST Endpoints", status: "planned" },
    { name: "Payments", tech: "Stripe Integration", status: "planned" },
    { name: "DevOps", tech: "Vercel + Fly.io", status: "planned" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-slate-300 to-slate-500 bg-clip-text text-transparent mb-4">
            Project Status
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed mb-6">
            Restaurant ordering and management platform - currently at the foundation stage
            with monorepo structure and development environment ready for implementation.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full">
            <Clock className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-blue-300 text-sm font-medium">Foundation Complete - Ready for Development</span>
          </div>
        </motion.div>

        {/* Tech Stack Overview */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-16"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-8 flex items-center">
            <Code2 className="mr-3 h-6 w-6 text-cyan-400" />
            Tech Stack Status
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
              >
                <h3 className="font-semibold mb-2">{item.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{item.tech}</p>
                <div className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  item.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {item.status === 'completed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                   item.status === 'in-progress' ? <Clock className="w-3 h-3 mr-1" /> :
                   <AlertCircle className="w-3 h-3 mr-1" />}
                  {item.status.replace('-', ' ')}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Completed Features */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-16"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-8 flex items-center">
            <CheckCircle2 className="mr-3 h-6 w-6 text-green-400" />
            Setup Complete ({completedFeatures.length}) 
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-6"
              >
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-100 mb-2">{feature.name}</h3>
                    <p className="text-sm text-green-200/80">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* In Progress Features */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-16"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-8 flex items-center">
            <Clock className="mr-3 h-6 w-6 text-yellow-400" />
            In Progress ({inProgressFeatures.length})
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inProgressFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6"
              >
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-yellow-100">{feature.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        feature.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {feature.priority}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-200/80">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Planned Features */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-16"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-8 flex items-center">
            <AlertCircle className="mr-3 h-6 w-6 text-slate-400" />
            Planned Features ({plannedFeatures.length})
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plannedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-slate-900/50 border border-slate-700 rounded-lg p-6"
              >
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">{feature.name}</h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Project Stats */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold mb-8 flex items-center">
            <Database className="mr-3 h-6 w-6 text-cyan-400" />
            Project Overview
          </motion.h2>
          <motion.div variants={itemVariants} className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-200 text-center">
              <strong>🚧 Current Status:</strong> Development environment and project templates are ready. 
              Next step is to set up Supabase database and implement core features.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{completedFeatures.length}</div>
              <div className="text-slate-400">Completed</div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{inProgressFeatures.length}</div>
              <div className="text-slate-400">In Progress</div>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-slate-400 mb-2">{plannedFeatures.length}</div>
              <div className="text-slate-400">Planned</div>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </div>
  );
} 