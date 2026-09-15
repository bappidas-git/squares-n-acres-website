import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useCssVars } from '../../hooks/useCssVar';
import { propertyService, leadService, articleService, dashboardService } from '../../services/api';

// Animated counter hook
const useAnimatedCount = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
};

// Stats Card Component — compact layout
const StatsCard = ({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  subLabel,
  trend,
  trendUp,
  loading,
}) => {
  const animatedValue = useAnimatedCount(loading ? 0 : value);

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0px 8px 24px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon icon={icon} style={{ fontSize: 22, color: iconColor }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading ? (
            <Skeleton width={50} height={32} />
          ) : (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'var(--color-charcoal)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.2,
              }}
            >
              {animatedValue.toLocaleString()}
            </Typography>
          )}
          {trend && (
            <Chip
              size="small"
              icon={
                <Icon
                  icon={trendUp ? 'mdi:trending-up' : 'mdi:trending-down'}
                  style={{ fontSize: 12 }}
                />
              }
              label={trend}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: trendUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: trendUp ? 'var(--color-success-dark)' : 'var(--color-error-dark)',
                '& .MuiChip-icon': { color: 'inherit', ml: '4px' },
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{ color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        {subLabel && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--color-text-muted)',
              display: 'block',
              fontSize: '0.675rem',
              lineHeight: 1.2,
            }}
          >
            {subLabel}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// Lead status config
const leadStatusConfig = {
  new: { label: 'New', color: 'var(--color-info-dark)', bg: 'var(--color-info-bg)' },
  contacted: {
    label: 'Contacted',
    color: 'var(--color-warning-dark)',
    bg: 'var(--color-warning-bg)',
  },
  qualified: {
    label: 'Qualified',
    color: 'var(--color-success-dark)',
    bg: 'var(--color-success-bg)',
  },
  converted: {
    label: 'Converted',
    color: 'var(--color-warning-dark)',
    bg: 'var(--color-warning-bg)',
  },
  lost: { label: 'Lost', color: 'var(--color-error-dark)', bg: 'var(--color-error-bg)' },
};

/** The token names the charts paint with, in series order. */
const CHART_SERIES_TOKENS = [
  '--color-charcoal',
  '--color-primary',
  '--color-info',
  '--color-success',
  '--color-warning',
  '--color-primary-dark',
];

/**
 * Simple SVG donut. SVG presentation attributes are not a reliable place for
 * `var()`, so the concrete colours are read off the document with `useCssVars`.
 */
const DonutChart = ({ data, size = 160 }) => {
  const [charcoal, muted] = useCssVars(['--color-charcoal', '--color-text-muted']);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, i) => {
          const pct = item.value / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const dashOffset = -offset;
          offset += pct * circumference;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill={charcoal}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill={muted}>
          Total
        </text>
      </svg>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {data.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
              {item.label}: <strong style={{ color: 'var(--color-charcoal)' }}>{item.value}</strong>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Simple bar chart
const BarChart = ({ data, maxHeight = 120 }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: maxHeight + 30, pt: 2 }}>
      {data.map((item, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'var(--color-text-muted)', mb: 0.5, fontWeight: 600 }}
          >
            {item.value}
          </Typography>
          <Box
            sx={{
              width: '100%',
              maxWidth: 40,
              height: Math.max((item.value / maxVal) * maxHeight, 4),
              bgcolor: item.color || 'var(--color-charcoal)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.8s ease',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'var(--color-text-muted)',
              mt: 0.5,
              fontSize: '0.625rem',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const Dashboard = () => {
  const seriesColors = useCssVars(CHART_SERIES_TOKENS);
  const [successColor, warningColor, infoColor] = useCssVars([
    '--color-success',
    '--color-warning',
    '--color-info',
  ]);
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeProperties: 0,
    inactiveProperties: 0,
    totalLeads: 0,
    newLeads7Days: 0,
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    websiteVisits: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [properties, setProperties] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Try unified dashboard API first (production-ready)
      try {
        const dashData = await dashboardService.get();
        if (dashData && dashData.totalProperties !== undefined) {
          setStats({
            totalProperties: dashData.totalProperties || 0,
            activeProperties: dashData.activeProperties || 0,
            inactiveProperties: dashData.inactiveProperties || 0,
            totalLeads: dashData.totalLeads || 0,
            newLeads7Days: dashData.newLeads7Days || 0,
            totalArticles: dashData.totalArticles || 0,
            publishedArticles: dashData.publishedArticles || 0,
            draftArticles: dashData.draftArticles || 0,
            websiteVisits: dashData.websiteVisits || 0,
          });
          setRecentLeads(dashData.recentLeads || []);
          setProperties(dashData.propertiesByStatus || []);
          setLoading(false);
          return;
        }
      } catch {
        // Dashboard API not available — fallback to individual calls
      }

      // Fallback: fetch from individual endpoints
      const results = await Promise.allSettled([
        propertyService.getAll(),
        leadService.getAll(),
        articleService.getAll(),
      ]);

      const allProperties = results[0].status === 'fulfilled' ? results[0].value : [];
      const allLeads = results[1].status === 'fulfilled' ? results[1].value : [];
      const allArticles = results[2].status === 'fulfilled' ? results[2].value : [];

      // Properties stats
      const activeProps = allProperties.filter((p) => p.isActive);
      const inactiveProps = allProperties.filter((p) => !p.isActive);

      // Lead stats — new leads in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newLeads7 = allLeads.filter(
        (l) => l.createdAt && new Date(l.createdAt) >= sevenDaysAgo
      );

      // Article stats
      const published = allArticles.filter((a) => a.isActive);
      const drafts = allArticles.filter((a) => !a.isActive);

      setStats({
        totalProperties: allProperties.length,
        activeProperties: activeProps.length,
        inactiveProperties: inactiveProps.length,
        totalLeads: allLeads.length,
        newLeads7Days: newLeads7.length,
        totalArticles: allArticles.length,
        publishedArticles: published.length,
        draftArticles: drafts.length,
        websiteVisits: 0,
      });

      setRecentLeads(
        [...allLeads]
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
          })
          .slice(0, 10)
      );
      setProperties(allProperties);
    } catch {
      // Load failed — the dashboard renders its empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Current date
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Lead source data for chart
  const leadsBySource = recentLeads.reduce((acc, lead) => {
    const src = lead.source || 'unknown';
    const label = src
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace('page', '')
      .trim();
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const sourceBarData = Object.entries(leadsBySource).map(([label, value], i) => ({
    label: label.length > 10 ? label.slice(0, 10) + '...' : label,
    value,
    color: seriesColors[i % seriesColors.length],
  }));

  // Property status data for donut
  const propertyStatusData = [
    {
      label: 'Ready to Move',
      value: properties.filter((p) => p.status === 'ready-to-move').length,
      color: successColor,
    },
    {
      label: 'Under Construction',
      value: properties.filter((p) => p.status === 'under-construction').length,
      color: warningColor,
    },
    {
      label: 'Pre-launch',
      value: properties.filter((p) => p.status === 'pre-launch').length,
      color: infoColor,
    },
  ];

  const getPropertyTitle = (propertyId) => {
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.title : '—';
  };

  return (
    <Box>
      {/* Welcome + Quick Actions Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2.5,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1.3 }}
          >
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
            {today}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Icon icon="mdi:plus" style={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/properties/add')}
            sx={{ borderRadius: 1.5, fontSize: '0.8rem', textTransform: 'none', py: 0.75 }}
          >
            Add Property
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<Icon icon="mdi:pencil-outline" style={{ fontSize: 16 }} />}
            onClick={() => navigate('/admin/articles/add')}
            sx={{
              borderRadius: 1.5,
              fontSize: '0.8rem',
              textTransform: 'none',
              py: 0.75,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Write Article
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}>
          <StatsCard
            icon="mdi:home-city-outline"
            iconColor="var(--color-charcoal)"
            iconBg="rgba(27,42,74,0.08)"
            label="Properties"
            value={stats.totalProperties}
            subLabel={`${stats.activeProperties} active`}
            trend="+12%"
            trendUp
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatsCard
            icon="mdi:account-group-outline"
            iconColor="var(--color-info)"
            iconBg="rgba(59,130,246,0.08)"
            label="Leads"
            value={stats.totalLeads}
            subLabel={`${stats.newLeads7Days} this week`}
            trend="+8%"
            trendUp
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatsCard
            icon="mdi:newspaper-variant-outline"
            iconColor="var(--color-success)"
            iconBg="rgba(16,185,129,0.08)"
            label="Articles"
            value={stats.totalArticles}
            subLabel={`${stats.publishedArticles} published`}
            trend="+5%"
            trendUp
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatsCard
            icon="mdi:eye-outline"
            iconColor="var(--color-primary)"
            iconBg="rgba(139,92,246,0.08)"
            label="Visits (30d)"
            value={stats.websiteVisits || 0}
            subLabel="Tracking pending"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts + Recent Leads — 3-column layout on desktop */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Lead Sources */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 2.5, height: '100%' }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 1.5 }}
            >
              Leads by Source
            </Typography>
            {sourceBarData.length > 0 ? (
              <BarChart data={sourceBarData} maxHeight={100} />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 120,
                  color: 'var(--color-text-muted)',
                }}
              >
                <Typography variant="caption">No lead data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* Property Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 2.5, height: '100%' }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: 'var(--color-charcoal)', mb: 1.5 }}
            >
              Properties by Status
            </Typography>
            {properties.length > 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart data={propertyStatusData} size={130} />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 120,
                  color: 'var(--color-text-muted)',
                }}
              >
                <Typography variant="caption">No data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* Lead Status Summary */}
        <Grid item xs={12} sm={6} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 2.5, height: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}
              >
                Lead Status Overview
              </Typography>
            </Box>
            {recentLeads.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.entries(leadStatusConfig).map(([key, cfg]) => {
                  const count = recentLeads.filter((l) => l.status === key).length;
                  const pct =
                    recentLeads.length > 0 ? Math.round((count / recentLeads.length) * 100) : 0;
                  return (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: cfg.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--color-text-muted)', flex: 1, minWidth: 70 }}
                      >
                        {cfg.label}
                      </Typography>
                      <Box
                        sx={{
                          flex: 2,
                          height: 6,
                          bgcolor: 'var(--color-surface)',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${pct}%`,
                            height: '100%',
                            bgcolor: cfg.color,
                            borderRadius: 1,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'var(--color-charcoal)',
                          fontWeight: 600,
                          minWidth: 24,
                          textAlign: 'right',
                        }}
                      >
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 120,
                  color: 'var(--color-text-muted)',
                }}
              >
                <Typography variant="caption">No lead data</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Leads Table */}
      <Paper sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
            Recent Leads
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => navigate('/admin/leads')}
            endIcon={<Icon icon="mdi:arrow-right" style={{ fontSize: 14 }} />}
            sx={{
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
              '&:hover': { color: 'var(--color-charcoal)' },
            }}
          >
            View All
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'var(--color-surface)', py: 1 } }}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Email
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  Phone
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  Source
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: { xs: 'none', lg: 'table-cell' },
                  }}
                >
                  Property
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recentLeads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 4, color: 'var(--color-text-muted)' }}
                  >
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                recentLeads.map((lead) => {
                  const statusCfg = leadStatusConfig[lead.status] || leadStatusConfig.new;
                  return (
                    <TableRow
                      key={lead.id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          color: 'var(--color-charcoal)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {lead.name}
                      </TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                        {lead.email}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'var(--color-text-muted)',
                          fontSize: '0.8125rem',
                          display: { xs: 'none', sm: 'table-cell' },
                        }}
                      >
                        {lead.phone}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'var(--color-text-muted)',
                          fontSize: '0.75rem',
                          display: { xs: 'none', md: 'table-cell' },
                        }}
                      >
                        {lead.source?.replace(/-/g, ' ') || '—'}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'var(--color-text-muted)',
                          fontSize: '0.75rem',
                          display: { xs: 'none', lg: 'table-cell' },
                          maxWidth: 140,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lead.propertyId ? getPropertyTitle(lead.propertyId) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusCfg.label}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: statusCfg.bg,
                            color: statusCfg.color,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'var(--color-text-muted)',
                          fontSize: '0.75rem',
                          display: { xs: 'none', sm: 'table-cell' },
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;
