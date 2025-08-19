export async function Paginate<T>(
  modelDelegate: {
    findMany: Function;
    count: Function;
  },
  options: {
    where?: any;
    page: number;
    limit: number;
    include?: any;
    orderBy?: any;
    select?: any;
    all?: boolean;
  },
): Promise<{ total: number; page: number; limit: number; data: T[] }> {
  const {
    where = {},
    page,
    limit,
    include,
    orderBy,
    select,
    all = false,
  } = options;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    modelDelegate.findMany({
      where,
      skip,
      take: limit,
      include,
      orderBy,
      select
    }),
    modelDelegate.count({ where }),
  ]);

  return {
    total,
    page,
    limit,
    data,
  };
}
