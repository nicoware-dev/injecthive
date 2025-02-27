import { Bot, LineChart, Briefcase, Wallet, Shield, Puzzle, Brain, Rocket, BarChart, Image, MessageSquare, Code, GraduationCap, Network, Coins, Building, Lightbulb, Sparkles, Shapes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { HomeHeader } from "./components/home-header";
import type { FC } from 'react';

// Import agent images
import salesAgentImg from "./assets/agents/Sales Agent.png";
import memeAgentImg from "./assets/agents/Meme Agent.png";
import demoAgentImg from "./assets/agents/Demo Agent.png";
import metricsAgentImg from "./assets/agents/Metrics Agent.png";
import alphaAgentImg from "./assets/agents/Alpha Agent.png";
import analystAgentImg from "./assets/agents/Analyst Agent.png";
import nftsAgentImg from "./assets/agents/NFTs Agent.png";
import kolAgentImg from "./assets/agents/KOL Agent.png";
import tokenDeployerImg from "./assets/agents/Token Deployer.png";
import nftDeployerImg from "./assets/agents/NFT Deployer.png";
import injectiveExpertImg from "./assets/agents/Injective Expert.png";
import predictionsAgentImg from "./assets/agents/Predictions Agent.png";
import coordinatorAgentImg from "./assets/agents/Coordinator Agent.png";
import defiAgentImg from "./assets/agents/DeFi Agent.png";
import tradingAgentImg from "./assets/agents/Trading Agent.png";
import walletAgentImg from "./assets/agents/Wallet Agent.png";
import daoAgentImg from "./assets/agents/DAO Agent.png";
import advisorAgentImg from "./assets/agents/Advisor Agent.png";

interface Agent {
    name: string;
    description: string;
    capabilities: string[];
    category: string;
    icon: React.ElementType;
    imagePath?: string;
}

interface AgentCategory {
    title: string;
    description: string;
    agents: Agent[];
}

interface AgentCardProps {
    agent: Agent;
}

interface AgentSectionProps {
    title: string;
    description: string;
    agents: Agent[];
}

const AgentCard: FC<AgentCardProps> = ({ agent }) => {
    const Icon = agent.icon;
    return (
        <Card className="bg-[#121212] border-[#27272A] hover:bg-[#1a1a1a] transition-all duration-300 h-full group">
            <CardHeader className="space-y-6 text-center">
                <div className="flex flex-col items-center gap-6">
                    {agent.imagePath ? (
                        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[#7f00ff] ring-offset-4 ring-offset-[#121212] group-hover:ring-4 transition-all duration-300">
                            <img
                                src={agent.imagePath}
                                alt={agent.name}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-2xl bg-[#7f00ff]/10 flex items-center justify-center ring-2 ring-[#7f00ff]/20 ring-offset-2 ring-offset-[#121212] group-hover:ring-[#7f00ff]/40 transition-all duration-300">
                            <Icon className="w-12 h-12 text-[#7f00ff]" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <CardTitle className="text-xl font-bold">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f00ff] to-[#ff1492]">
                                {agent.name}
                            </span>
                        </CardTitle>
                        <div className="text-sm font-medium text-[#7f00ff]/80">{agent.category}</div>
                        <CardDescription className="text-base leading-relaxed">
                            {agent.description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#7f00ff]/20 to-transparent" />
                        <div className="text-sm font-semibold text-[#7f00ff]">Capabilities</div>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#7f00ff]/20 to-transparent" />
                    </div>
                    <ul className="grid gap-2 text-sm text-muted-foreground/90">
                        {agent.capabilities.map((capability: string) => (
                            <li key={capability} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#7f00ff]/40" />
                                {capability}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

const AgentSection: FC<AgentSectionProps> = ({ title, description, agents }) => {
    return (
        <section className="space-y-8">
            <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold title-gradient">{title}</h2>
                <p className="text-lg text-muted-foreground/90 max-w-3xl mx-auto">{description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {agents.map((agent) => (
                    <AgentCard key={agent.name} agent={agent} />
                ))}
            </div>
        </section>
    );
};

const agentCategories: Record<string, AgentCategory> = {
    internal: {
        title: "Internal Agents",
        description: "Core platform operations and management",
        agents: [
            {
                name: "Sales Agent",
                description: "Advanced sales and business development system",
                capabilities: ["Lead generation", "Sales automation", "Pipeline management", "Deal tracking", "Revenue optimization"],
                category: "Sales",
                icon: Bot,
                imagePath: salesAgentImg
            },
            {
                name: "Meme Agent",
                description: "Creative content and meme generation system",
                capabilities: ["Meme creation", "Trend analysis", "Content virality", "Social engagement", "Brand awareness"],
                category: "Marketing",
                icon: Image,
                imagePath: memeAgentImg
            },
            {
                name: "Demo Agent",
                description: "Interactive platform demonstration and onboarding",
                capabilities: ["Feature showcase", "User guidance", "Live demonstrations", "Use case examples", "Product tutorials"],
                category: "Support",
                icon: Puzzle,
                imagePath: demoAgentImg
            }
        ]
    },
    public: {
        title: "Public Agents",
        description: "Shared services available to all users",
        agents: [
            {
                name: "Metrics Agent",
                description: "Comprehensive analytics platform providing real-time insights for Injective ecosystem",
                capabilities: ["TVL tracking", "APY monitoring", "Protocol analytics", "Market trends", "Custom dashboards"],
                category: "Analytics",
                icon: BarChart,
                imagePath: metricsAgentImg
            },
            {
                name: "Alpha Agent",
                description: "Advanced market opportunity discovery through multi-source analysis",
                capabilities: ["Social media analysis", "Pattern detection", "Signal generation", "Market research", "Sentiment analysis"],
                category: "Research",
                icon: Brain,
                imagePath: alphaAgentImg
            },
            {
                name: "Analyst Agent",
                description: "Comprehensive market analysis with advanced risk assessment capabilities",
                capabilities: ["Market analysis", "Risk assessment", "Technical analysis", "Report generation", "Portfolio evaluation"],
                category: "Analysis",
                icon: LineChart,
                imagePath: analystAgentImg
            },
            {
                name: "NFTs Agent",
                description: "Comprehensive NFT market intelligence and collection analysis platform",
                capabilities: ["Collection tracking", "Floor price monitoring", "Rarity analysis", "Market trends", "Whale tracking"],
                category: "Analytics",
                icon: Image,
                imagePath: nftsAgentImg
            },
            {
                name: "KOL Agent",
                description: "Professional key opinion leader service optimizing crypto project visibility",
                capabilities: ["Tweet composition", "Engagement optimization", "Campaign management", "Analytics reporting", "Network coordination"],
                category: "Marketing",
                icon: MessageSquare,
                imagePath: kolAgentImg
            },
            {
                name: "Token Deployer",
                description: "Intuitive natural language interface for secure token deployment",
                capabilities: ["Token creation", "Contract verification", "Parameter configuration", "Deployment management", "Security audit"],
                category: "Development",
                icon: Code,
                imagePath: tokenDeployerImg
            },
            {
                name: "NFT Deployer",
                description: "Streamlined NFT collection deployment and management system",
                capabilities: ["Collection deployment", "Metadata management", "Minting configuration", "Royalty setup", "IPFS integration"],
                category: "Development",
                icon: Shapes,
                imagePath: nftDeployerImg
            },
            {
                name: "Injective Expert",
                description: "Specialized knowledge base for Injective Network",
                capabilities: [
                    "Protocol guidance",
                    "Gas optimization",
                    "Bridge operations",
                    "DeFi strategies",
                    "Network updates"
                ],
                category: "Support",
                icon: GraduationCap,
                imagePath: injectiveExpertImg
            },
            {
                name: "Predictions Agent",
                description: "Advanced predictive analytics for market trends and behavior patterns",
                capabilities: ["Trend prediction", "Pattern analysis", "Market cycles", "Sentiment forecasting", "Price prediction"],
                category: "Analytics",
                icon: Sparkles,
                imagePath: predictionsAgentImg
            }
        ]
    },
    private: {
        title: "Private Agents",
        description: "Dedicated instances for specific users/organizations",
        agents: [
            {
                name: "Coordinator Agent",
                description: "Advanced orchestration system for multi-agent operations",
                capabilities: ["Agent coordination", "Task delegation", "System monitoring", "Performance optimization", "Resource allocation"],
                category: "System",
                icon: Network,
                imagePath: coordinatorAgentImg
            },
            {
                name: "DeFi Agent",
                description: "Comprehensive DeFi operations and yield optimization system",
                capabilities: ["Yield farming", "Liquidity provision", "Strategy execution", "Risk management", "Portfolio rebalancing"],
                category: "Operations",
                icon: Briefcase,
                imagePath: defiAgentImg
            },
            {
                name: "Trading Agent",
                description: "Sophisticated trading and position management system",
                capabilities: ["Trade execution", "Position management", "Market making", "Portfolio optimization", "Risk management"],
                category: "Trading",
                icon: LineChart,
                imagePath: tradingAgentImg
            },
            {
                name: "Wallet Agent",
                description: "Comprehensive wallet operations and security management system",
                capabilities: ["Transaction management", "Security monitoring", "Gas optimization", "Balance tracking", "Multi-sig support"],
                category: "Security",
                icon: Wallet,
                imagePath: walletAgentImg
            },
            {
                name: "DAO Agent",
                description: "Comprehensive DAO management and treasury optimization system",
                capabilities: ["Treasury management", "Proposal analysis", "Fund allocation", "Governance tracking", "Performance monitoring"],
                category: "Governance",
                icon: Building,
                imagePath: daoAgentImg
            },
            {
                name: "Advisor Agent",
                description: "Personalized financial and business strategy advisor",
                capabilities: ["Strategy development", "Risk assessment", "Portfolio planning", "Growth consulting", "Performance tracking"],
                category: "Advisory",
                icon: Lightbulb,
                imagePath: advisorAgentImg
            }
        ]
    }
};

export default function Agents() {
    return (
        <div className="min-h-screen bg-background">
            <HomeHeader />
            <div className="py-16 container space-y-20">
                <div className="text-center space-y-6">
                    <h1 className="text-5xl font-black title-gradient">InjectHive Agent Directory</h1>
                    <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">
                        Explore our comprehensive suite of AI agents designed to revolutionize DeFi operations on Injective.
                    </p>
                </div>

                {Object.entries(agentCategories).map(([key, category]) => (
                    <AgentSection
                        key={key}
                        title={category.title}
                        description={category.description}
                        agents={category.agents}
                    />
                ))}
            </div>
        </div>
    );
}
